from flask import Flask, request, jsonify, render_template, send_from_directory, redirect, url_for
import joblib
from dataclasses import dataclass
import pandas as pd
from flask_mail import Mail, Message
from flask_cors import CORS
import json
import time
import os
from datetime import datetime

# ----------------------
# Setup Flask
# ----------------------
app = Flask(__name__, 
            template_folder='templates',  # Tell Flask where HTML files are
            static_folder='static')        # Tell Flask where static files are
CORS(app)

# Email config - REPLACE with your app password
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587  # Changed to 587 (better deliverability)
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'breaker.monitor.system@gmail.com'
app.config['MAIL_PASSWORD'] = 'kzng lhzr elww gyyu'  # CHANGE THIS
app.config['MAIL_DEFAULT_SENDER'] = 'breaker.monitor.system@gmail.com'

try:
    mail = Mail(app)
    print("✓ Email service initialized with TLS on port 587")
except Exception as e:
    print(f"✗ Email initialization error: {e}")
    mail = None
# ----------------------
# Load Models
# ----------------------
hotspot_model = None
overload_model = None

try:
    if os.path.exists("ml/hotspot_model.pkl"):
        hotspot_model = joblib.load("ml/hotspot_model.pkl")
        print("✓ Hotspot model loaded")
    else:
        print("✗ Hotspot model file not found")
        
    if os.path.exists("ml/overload_model.pkl"):
        overload_model = joblib.load("ml/overload_model.pkl")
        print("✓ Overload model loaded")
    else:
        print("✗ Overload model file not found")
        
except Exception as e:
    print(f"✗ Error loading models: {e}")

# ----------------------
# Sensor Reading Dataclass
# ----------------------
@dataclass
class SensorReading:
    ambient_temp_c: float
    temperature_c: float
    temperature_rise_c: float
    current_a: float
    thermal_slope_c_per_5s: float
    current_slope_a_per_5s: float

# ----------------------
# Prediction Function
# ----------------------
def predict_risk(reading):
    if hotspot_model is None or overload_model is None:
        return {
            "hotspot_flag": int(reading.temperature_c > 75 or reading.current_a > 23),
            "overload_flag": int(reading.temperature_c > 48 or reading.current_a > 13),  # Changed to prevention thresholds
            "hotspot_prob": 0.5 if reading.temperature_c > 75 else 0.0,
            "overload_prob": 0.5 if reading.current_a > 13 else 0.0  # Changed to prevention thresholds
        }
    
    try:
        x_new = pd.DataFrame([{
            "ambient_temp_c": reading.ambient_temp_c,
            "temperature_c": reading.temperature_c,
            "temperature_rise_c": reading.temperature_rise_c,
            "current_a": reading.current_a,
            "thermal_slope_c_per_5s": reading.thermal_slope_c_per_5s,
            "current_slope_a_per_5s": reading.current_slope_a_per_5s,
        }])

        hotspot_prob = float(hotspot_model.predict_proba(x_new)[0, 1])
        overload_prob = float(overload_model.predict_proba(x_new)[0, 1])

        return {
            "hotspot_flag": int(hotspot_prob >= 0.45),
            "overload_flag": int(overload_prob >= 0.40),
            "hotspot_prob": hotspot_prob,
            "overload_prob": overload_prob
        }
    except Exception as e:
        print(f"Error in prediction: {e}")
        return {
            "hotspot_flag": 0,
            "overload_flag": 0,
            "hotspot_prob": 0.0,
            "overload_prob": 0.0
        }

# ----------------------
# ----------------------
# Email Alert Function with BCC (Hidden Recipients)
# ----------------------
def send_breaker_alert(reading, risk, alert_type):
    if mail is None:
        return False, "Email service not configured"
    
    # Define multiple recipients (all will be hidden from each other)
    bcc_recipients = [
        'yuriolynx@gmail.com',      # Main recipient
        'gwenlykapergis@gmail.com',   # Secondary recipient
        # Add more emails here - all will be hidden from each other
    ]
    
    if alert_type == "overheating":
        subject = "🔥 CRITICAL: Breaker Overheating Alert!"
        body = f"""
⚠️ IMMEDIATE ACTION REQUIRED ⚠️

BREAKER OVERHEATING DETECTED!

Current Readings:
• Temperature: {reading.temperature_c:.1f}°C
• Current: {reading.current_a:.1f}A
• Temperature Rise: {reading.temperature_rise_c:.1f}°C
• Ambient Temp: {reading.ambient_temp_c:.1f}°C

Risk Assessment:
• Hotspot Probability: {risk['hotspot_prob']*100:.1f}%
• Overload Probability: {risk['overload_prob']*100:.1f}%

Recommended Action:
🚨 IMMEDIATE: Isolate circuit and investigate!

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
This is an automated alert from the Breaker Monitoring System.
        """
    elif alert_type == "prevention":
        subject = "⚠️ PREVENTION: Potential Overload Detected!"
        body = f"""
⚠️ PREVENTIVE ACTION RECOMMENDED ⚠️

POTENTIAL OVERLOAD DEVELOPING!

Current Readings:
• Temperature: {reading.temperature_c:.1f}°C
• Current: {reading.current_a:.1f}A
• Temperature Rise: {reading.temperature_rise_c:.1f}°C
• Ambient Temp: {reading.ambient_temp_c:.1f}°C

Risk Assessment:
• Potential overload condition developing
• Take preventive action now

Recommended Action:
🛡️ PROACTIVE: Reduce load by 15-20% to prevent critical condition!

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
This is an automated alert from the Breaker Monitoring System.
        """
    else:
        subject = "⚠️ Breaker Alert: Combined Risk Detected!"
        body = f"""
⚠️ ALERT: Breaker Risk Detected!

Current Readings:
• Temperature: {reading.temperature_c:.1f}°C
• Current: {reading.current_a:.1f}A
• Temperature Rise: {reading.temperature_rise_c:.1f}°C

Risk Assessment:
• Hotspot Probability: {risk['hotspot_prob']*100:.1f}%
• Overload Probability: {risk['overload_prob']*100:.1f}%

Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---
This is an automated alert from the Breaker Monitoring System.
        """
    
    try:
        # Create message with BCC only - recipients hidden from each other
        msg = Message(
            subject=subject,
            sender=app.config['MAIL_USERNAME'],
            recipients=[],                      # Empty visible recipients
            bcc=bcc_recipients,                 # All recipients hidden
            reply_to=app.config['MAIL_USERNAME']
        )
        msg.body = body
        
        # Add additional headers to avoid spam
        msg.extra_headers = {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'High',
            'X-Mailer': 'Breaker Monitoring System v1.0'
        }
        
        mail.send(msg)
        
        # Log who received the email (without revealing to others)
        print(f"✓ Email sent to {len(bcc_recipients)} recipients (BCC hidden): {subject}")
        
        return True, f"Alert sent to {len(bcc_recipients)} recipients (BCC)"
        
    except Exception as e:
        print(f"✗ Email error: {e}")
        return False, f"Failed to send alert: {str(e)}"
    
# ----------------------
# Alert Tracking
# ----------------------
last_alert_time = {}
ALERT_COOLDOWN_SECONDS = 300

def should_send_alert(alert_type):
    current_time = time.time()
    if alert_type in last_alert_time:
        if current_time - last_alert_time[alert_type] < ALERT_COOLDOWN_SECONDS:
            return False
    last_alert_time[alert_type] = current_time
    return True

# ----------------------
# ROUTES - Now using templates folder with redirect fix
# ----------------------

@app.route('/')
def index():
    """Serve the main dashboard"""
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Error loading index.html: {e}", 404

@app.route('/index.html')
def index_html():
    """Handle direct access to index.html by redirecting to root"""
    return redirect(url_for('index'))

@app.route('/full_history.html')
def full_history():
    """Serve the full history page"""
    try:
        return render_template('full_history.html')
    except Exception as e:
        return f"Error loading full_history.html: {e}", 404

# Optional: Catch-all for any other HTML files
@app.route('/<page>.html')
def serve_html_page(page):
    """Serve any HTML file from templates folder"""
    try:
        return render_template(f'{page}.html')
    except Exception:
        return f"Page {page}.html not found", 404

# ----------------------
# API Endpoints
# ----------------------

@app.route("/api/check-alert", methods=['POST'])
def check_alert():
    try:
        data = request.json
        print(f"Received alert check: Temp={data.get('temperature')}°C, Current={data.get('current')}A")
        
        reading = SensorReading(
            ambient_temp_c=float(data.get('ambient_temp_c', 25.0)),
            temperature_c=float(data['temperature']),
            temperature_rise_c=float(data['temperature']) - float(data.get('ambient_temp_c', 25.0)),
            current_a=float(data['current']),
            thermal_slope_c_per_5s=float(data.get('thermal_slope', 0.0)),
            current_slope_a_per_5s=float(data.get('current_slope', 0.0))
        )
        
        risk = predict_risk(reading)
        alert_sent = False
        alert_messages = []
        
        # CRITICAL: Overheating
        if reading.temperature_c > 75 or reading.current_a > 23 or risk['hotspot_flag']:
            if should_send_alert("overheating"):
                success, msg = send_breaker_alert(reading, risk, "overheating")
                if success:
                    alert_sent = True
                    alert_messages.append("Overheating alert sent")
                else:
                    alert_messages.append(f"Failed: {msg}")
        
        # PREVENTION: Potential Overload (changed thresholds)
        elif reading.temperature_c > 48 or reading.current_a > 13 or risk['overload_flag']:
            if should_send_alert("prevention"):
                success, msg = send_breaker_alert(reading, risk, "prevention")
                if success:
                    alert_sent = True
                    alert_messages.append("Prevention alert sent")
                else:
                    alert_messages.append(f"Failed: {msg}")
        
        return jsonify({
            "success": True,
            "alert_sent": alert_sent,
            "messages": alert_messages if alert_messages else ["No alert triggered"],
            "risk": risk
        })
        
    except Exception as e:
        print(f"Error in check_alert: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route("/test-alert")
def test_alert():
    test_reading = SensorReading(
        ambient_temp_c=35.0,
        temperature_c=92.0,
        temperature_rise_c=57.0,
        current_a=38.0,
        thermal_slope_c_per_5s=45.0,
        current_slope_a_per_5s=8.0
    )
    
    risk = predict_risk(test_reading)
    
    if risk['hotspot_flag'] or risk['overload_flag']:
        alert_type = "overheating" if risk['hotspot_flag'] else "prevention"
        success, msg = send_breaker_alert(test_reading, risk, alert_type)
        if success:
            return f"Test alert sent successfully!\n\n{msg}"
        else:
            return f"Failed to send test alert: {msg}", 500
    else:
        return "No alert triggered for test data."

@app.route("/api/health", methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "models_loaded": hotspot_model is not None and overload_model is not None,
        "email_configured": mail is not None,
        "timestamp": datetime.now().isoformat()
    })

# ----------------------
# Debug route
# ----------------------
@app.route("/debug-info")
def debug_info():
    """Debug endpoint to see what files are available"""
    import os
    
    templates_folder = app.template_folder
    static_folder = app.static_folder
    
    templates_files = []
    if os.path.exists(templates_folder):
        templates_files = os.listdir(templates_folder)
    
    static_files = []
    if os.path.exists(static_folder):
        static_files = os.listdir(static_folder)
    
    return jsonify({
        "current_directory": os.getcwd(),
        "templates_folder": templates_folder,
        "templates_files": templates_files,
        "static_folder": static_folder,
        "static_files": static_files,
        "ml_models": os.listdir('ml') if os.path.exists('ml') else []
    })

# ----------------------
# Run App
# ----------------------
if __name__ == "__main__":
    print("\n" + "="*50)
    print("Breaker Monitoring API Server")
    print("="*50)
    print(f"Templates folder: {app.template_folder}")
    print(f"Static folder: {app.static_folder}")
    print("="*50)
    print(f"Server running on: http://127.0.0.1:5000")
    print(f"Dashboard: http://127.0.0.1:5000/")
    print(f"API Health: http://127.0.0.1:5000/api/health")
    print(f"Debug Info: http://127.0.0.1:5000/debug-info")
    print("="*50 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)