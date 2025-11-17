import os
import time
from urllib.parse import urlencode, urlparse

from flask import Flask, request, jsonify, redirect
from openai import OpenAI
from flask_cors import CORS
from authlib.integrations.flask_client import OAuth
import jwt

from scenarios import scenarios  # mevcut sözlük

app = Flask(__name__)

# ---- Config ----
FRONTEND_URL = os.environ.get("FRONTEND_URL")  # query YOK
BACKEND_URL = os.environ.get("BACKEND_URL")
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET")

def extract_origin(url):
    if not url:
        return None
    u = urlparse(url)
    return f"{u.scheme}://{u.netloc}"

FRONTEND_ORIGIN = extract_origin(FRONTEND_URL)

# ---- CORS (/api/*) ----
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [FRONTEND_ORIGIN] if FRONTEND_ORIGIN else "*",
            "supports_credentials": True,
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Authorization"],
            "methods": ["GET", "POST", "OPTIONS"]
        }
    }
)

# ---- OpenAI ----
API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set!")
client = OpenAI(api_key=API_KEY)

# ---- OAuth ----
oauth = OAuth(app)

oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    # base veriyoruz; "userinfo" göreli path'i çalışsın
    api_base_url="https://openidconnect.googleapis.com/v1/",
    client_kwargs={"scope": "openid email profile", "prompt": "consent"},
)

# ---- Helpers ----
def issue_jwt(user: dict) -> str:
    now = int(time.time())
    payload = {
        "sub": user.get("sub"),
        "name": user.get("name"),
        "email": user.get("email"),
        "picture": user.get("picture"),
        "provider": user.get("provider"),
        "iat": now,
        "exp": now + 7 * 24 * 60 * 60,
        "iss": "convince-backend",
        "aud": "convince-frontend",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def current_user_from_auth_header():
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="convince-frontend")
        return data
    except Exception:
        return None

# ---- Health / Root ----
@app.get("/")
def root():
    return "OK", 200

# ---- Auth endpoints ----
@app.get("/api/auth/login/google")
def auth_login_google():
    redirect_uri = f"{BACKEND_URL}/api/auth/callback/google"
    return oauth.google.authorize_redirect(redirect_uri)

@app.get("/api/auth/callback/google")
def auth_callback_google():
    try:
        token = oauth.google.authorize_access_token()

        # 1) userinfo endpoint (base_url tanımlı → göreli path çalışır)
        data = {}
        try:
            resp = oauth.google.get("userinfo")
            if resp is not None and getattr(resp, "content", None):
                data = resp.json()
        except Exception:
            data = {}

        # 2) fallback: ID token
        if not data.get("sub"):
            try:
                idinfo = oauth.google.parse_id_token(token)
            except Exception:
                idinfo = {}
            # idinfo varsa birleştir
            if idinfo:
                data = {**idinfo, **data}

        sub = data.get("sub") or data.get("id")
        name = data.get("name") or data.get("given_name") or ""
        email = data.get("email")
        picture = data.get("picture")

        if not sub:
            return jsonify({"error": "Failed to fetch Google user info"}), 500

        user = {
            "sub": f"google:{sub}",
            "name": name,
            "email": email,
            "picture": picture,
            "provider": "google",
        }

        jwt_token = issue_jwt(user)
        to = f"{FRONTEND_URL}?{urlencode({'token': jwt_token})}"
        return redirect(to, code=302)

    except Exception as e:
        print("Google callback error:", repr(e))  # Render logs
        return jsonify({"error": "OAuth callback failed", "detail": str(e)}), 500

@app.get("/api/auth/me")
def auth_me():
    user = current_user_from_auth_header()
    if not user:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": user})

# ---- Business endpoints ----
@app.get("/api/scenarios")
def get_scenarios():
    simplified_scenarios = []
    for sid, scenario in scenarios.items():
        simplified_scenarios.append({
            "id": sid,
            "name": scenario["Senaryo Adı"],
            "story": scenario["Hikaye"],
            "purpose": scenario["Amaç"],
            "system_prompt": scenario["System Prompt"],
            "first_message": scenario["İlk Mesaj"],
            "goal": scenario["Goal"],
        })
    return jsonify(simplified_scenarios)

@app.post("/api/ask")
def ask():
    data = request.json or {}
    user_input = data.get("user_input")
    scenario_id = data.get("scenario_id")
    history = data.get("history", [])

    if user_input is None or scenario_id is None:
        return jsonify({"error": "Missing user_input or scenario_id"}), 400

    scenario = scenarios.get(scenario_id)
    if not scenario:
        return jsonify({"error": "Invalid scenario_id"}), 400

    try:
        story_text = scenario["Hikaye"]
        system_prompt_text = scenario["System Prompt"]

        system_content = (
            f"Hikaye: {story_text}\n"
            f"""Ana prompt: {system_prompt_text}, If the other party becomes aggressive, disrespectful, or uses profanity, do not continue negotiating. 
            Calmly say, “This conversation is no longer productive. I’m ending the negotiation here.” 
            In Turkish, also say: "Görüşmeyi burada sonlandırıyorum." 
            Then stop all responses and end the conversation. 
            Do not argue or justify your decision.
            """
        )

        messages = [{"role": "system", "content": system_content}]
        for m in history:
            if m.get("sender") == "user":
                messages.append({"role": "user", "content": m.get("text", "")})
            else:
                messages.append({"role": "assistant", "content": m.get("text", "")})
        messages.append({"role": "user", "content": user_input})

        chat_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        answer = chat_completion.choices[0].message.content
        return jsonify({"answer": answer})

    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return jsonify({"error": "Soru cevaplanırken hata oluştu"}), 500

if __name__ == "__main__":
    app.run(debug=True)
