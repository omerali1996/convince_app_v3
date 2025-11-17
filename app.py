import os
import time
from urllib.parse import urlencode

from flask import Flask, request, jsonify, redirect
from openai import OpenAI
from flask_cors import CORS
from authlib.integrations.flask_client import OAuth
import jwt

from scenarios import scenarios  # senin senaryoların

app = Flask(__name__)

# ---- Config & CORS ----
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:5000")
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "change-me")  # Flask session için
JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-too")  # JWT imzası

# CORS: frontenden API çağrıları için
CORS(app, origins=[FRONTEND_URL], supports_credentials=True)

# ---- OpenAI ----
API_KEY = os.environ.get("OPENAI_API_KEY")
if not API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set!")
client = OpenAI(api_key=API_KEY)

# ---- OAuth ----
oauth = OAuth(app)

# Google
oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile",
        "prompt": "consent"
    },
)

# Facebook
oauth.register(
    name="facebook",
    client_id=os.environ.get("FACEBOOK_CLIENT_ID"),
    client_secret=os.environ.get("FACEBOOK_CLIENT_SECRET"),
    access_token_url="https://graph.facebook.com/oauth/access_token",
    authorize_url="https://www.facebook.com/v12.0/dialog/oauth",
    api_base_url="https://graph.facebook.com/",
    client_kwargs={"scope": "public_profile email"},
)

# ---- Helpers ----
def issue_jwt(user):
    """
    user: dict -> {"sub", "name", "email", "picture", "provider"}
    """
    now = int(time.time())
    payload = {
        "sub": user.get("sub"),
        "name": user.get("name"),
        "email": user.get("email"),
        "picture": user.get("picture"),
        "provider": user.get("provider"),
        "iat": now,
        "exp": now + 7 * 24 * 60 * 60,  # 7 gün
        "iss": "convince-backend",
        "aud": "convince-frontend",
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token

def current_user_from_auth_header():
    """Authorization: Bearer <token>"""
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="convince-frontend")
        return data
    except Exception:
        return None

# ---- Auth endpoints ----
@app.route("/api/auth/login/<provider>")
def auth_login(provider):
    if provider not in ("google", "facebook"):
        return jsonify({"error": "Unsupported provider"}), 400

    redirect_uri = f"{BACKEND_URL}/api/auth/callback/{provider}"
    if provider == "google":
        return oauth.google.authorize_redirect(redirect_uri)
    else:
        # Facebook ayrıca display param vs. alabilir, basit tutuyoruz
        return oauth.facebook.authorize_redirect(redirect_uri)

@app.route("/api/auth/callback/<provider>")
def auth_callback(provider):
    if provider == "google":
        token = oauth.google.authorize_access_token()
        # Google userinfo (OpenID)
        userinfo = oauth.google.parse_id_token(token)
        # Yedek: bazı durumlarda 'userinfo' endpoint:
        if not userinfo:
            resp = oauth.google.get("userinfo")
            userinfo = resp.json()
        user = {
            "sub": f"google:{userinfo.get('sub') or userinfo.get('id')}",
            "name": userinfo.get("name"),
            "email": userinfo.get("email"),
            "picture": userinfo.get("picture"),
            "provider": "google",
        }
    elif provider == "facebook":
        token = oauth.facebook.authorize_access_token()
        # Facebook profili
        resp = oauth.facebook.get("me", params={"fields": "id,name,email,picture.type(large)"})
        data = resp.json()
        pic = (data.get("picture") or {}).get("data") or {}
        user = {
            "sub": f"facebook:{data.get('id')}",
            "name": data.get("name"),
            "email": data.get("email"),  # email izin verilmemişse None olabilir
            "picture": pic.get("url"),
            "provider": "facebook",
        }
    else:
        return jsonify({"error": "Unsupported provider"}), 400

    jwt_token = issue_jwt(user)

    # Frontend'e token ile geri dön
    to = f"{FRONTEND_URL}?{urlencode({'token': jwt_token})}"
    return redirect(to, code=302)

@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    user = current_user_from_auth_header()
    if not user:
        return jsonify({"authenticated": False}), 401
    return jsonify({"authenticated": True, "user": user})

# ---- Business endpoints (mevcutlar) ----
@app.route("/api/scenarios", methods=["GET"])
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

@app.route("/api/ask", methods=["POST"])
def ask():
    data = request.json
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

        if history:
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
