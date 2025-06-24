from flask import Blueprint, request, jsonify, Response
from config import db
from models import Customer, Complaint
from utils import gen_complaint_id, send_sms
from datetime import datetime
from twilio.twiml.voice_response import VoiceResponse, Gather

bp = Blueprint('routes', __name__)

# Temporary in-memory session store (can be replaced with Redis/DB if needed)
user_sessions = {}

@bp.route("/voice", methods=["POST"])
def voice():
    response = VoiceResponse()
    gather = Gather(input='speech', action='/process_beneficiary', timeout=5)
    gather.say("Welcome to Customer Support. Please say your Beneficiary Number.")
    response.append(gather)
    response.redirect('/voice')
    return Response(str(response), mimetype='text/xml')

@bp.route("/process_beneficiary", methods=["POST"])
def process_beneficiary():
    speech = request.form.get("SpeechResult", "").strip()
    call_sid = request.form.get("CallSid")
    session = user_sessions.setdefault(call_sid, {})
    session["beneficiary_no"] = speech

    response = VoiceResponse()
    gather = Gather(input='speech', action='/process_account', timeout=5)
    gather.say("Thank you. Now say your Account Number.")
    response.append(gather)
    response.redirect('/voice')
    return Response(str(response), mimetype='text/xml')

@bp.route("/process_account", methods=["POST"])
def process_account():
    speech = request.form.get("SpeechResult", "").strip()
    call_sid = request.form.get("CallSid")
    session = user_sessions.get(call_sid, {})
    session["account_number"] = speech

    customer = Customer.query.filter_by(
        beneficiary_no=session.get("beneficiary_no"),
        account_number=speech
    ).first()

    response = VoiceResponse()
    if customer:
        session.update({
            "verified": True,
            "customer_id": customer.id,
            "name": customer.name,
            "phone": customer.phone
        })
        gather = Gather(input='speech', action='/process_option', timeout=5)
        gather.say(f"Thanks {customer.name}. Say one to hear unresolved complaints or two to register a new complaint.")
        response.append(gather)
    else:
        response.say("Verification failed. Please call again.")
        response.hangup()

    return Response(str(response), mimetype='text/xml')

@bp.route("/process_option", methods=["POST"])
def process_option():
    speech = request.form.get("SpeechResult", "").strip().lower()
    call_sid = request.form.get("CallSid")
    session = user_sessions.get(call_sid, {})
    customer_id = session.get("customer_id")

    response = VoiceResponse()
    if not customer_id:
        response.say("Session not found. Please call again.")
        response.hangup()
        return Response(str(response), mimetype='text/xml')

    sms_text = ""
    
    if "1" in speech or "history" in speech:
        complaints = Complaint.query.filter_by(customer_id=customer_id, status="Open").all()
        if complaints:
            summary = ", ".join(c.issue_type for c in complaints)
            response_text = f"You have {len(complaints)} unresolved complaints: {summary}."
        else:
            response_text = "You have no unresolved complaints."

        response.say(response_text)
        sms_text = response_text

    elif "2" in speech or "new" in speech:
        response_text = "To raise a new complaint, please use our website or mobile app."
        response.say(response_text)
        sms_text = response_text

    else:
        response_text = "Sorry, I didn't understand your option."
        response.say(response_text)

    # ✅ Send SMS to verified users
    if session.get("verified") and session.get("phone") and sms_text:
        try:
            send_sms(session["phone"], f"BOT: {sms_text}")
        except Exception as e:
            print("Twilio SMS Error:", e)

    response.say("Thank you for calling. Goodbye.")
    response.hangup()
    return Response(str(response), mimetype='text/xml')

# TEXT API Routes

@bp.route('/fetch-customer/<beneficiary_no>', methods=['GET'])
def fetch_customer(beneficiary_no):
    cust = Customer.query.filter_by(beneficiary_no=beneficiary_no).first()
    if not cust:
        return jsonify({'message': 'Customer not found'}), 404

    complaints = [{
        'complaint_id': c.complaint_id,
        'issue_type': c.issue_type,
        'status': c.status,
        'estimated_restoration_time': c.estimated_restoration_time
    } for c in cust.complaints if c.status.lower() != "resolved"]

    return jsonify({
        'name': cust.name,
        'phone': cust.phone,
        'customer_type': cust.customer_type,
        'account_number': cust.account_number,
        'meter_id': cust.meter_id,
        'complaints': complaints
    })

@bp.route('/new-complaint', methods=['POST'])
def new_complaint():
    d = request.json
    cust = Customer.query.filter_by(beneficiary_no=d['beneficiary_no']).first()

    if not cust:
        cust = Customer(
            beneficiary_no=d['beneficiary_no'],
            name=d['name'],
            phone=d['phone'],
            meter_id=d['meter_id'],
            customer_type=d.get('customer_type'),
            account_number=d.get('account_number')
        )
        db.session.add(cust)
        db.session.commit()

    cid = gen_complaint_id()
    complaint = Complaint(
        complaint_id=cid,
        customer_id=cust.id,
        issue_type=d['issue_type'],
        complaint_type=d.get('complaint_type', 'text')
    )
    db.session.add(complaint)
    db.session.commit()

    return jsonify({'complaint_id': cid})

@bp.route('/close-complaint/<complaint_id>', methods=['POST'])
def close_complaint(complaint_id):
    comp = Complaint.query.filter_by(complaint_id=complaint_id).first()
    if not comp:
        return jsonify({'message': 'Complaint not found'}), 404

    comp.status = "Resolved"
    comp.resolved_at = datetime.utcnow()
    comp.resolution_note = request.json.get('resolution_note', '')
    db.session.commit()

    send_sms(comp.customer.phone, f"Your complaint {comp.complaint_id} has been resolved.")
    return jsonify({'message': 'Complaint closed and SMS sent'})

@bp.route('/pending-complaints/<beneficiary_no>', methods=['GET'])
def pending_complaints(beneficiary_no):
    cust = Customer.query.filter_by(beneficiary_no=beneficiary_no).first()
    if not cust:
        return jsonify({'message': 'Customer not found'}), 404

    # Only filter complaints with exact status "Open"
    pending = [c for c in cust.complaints if c.status.lower() == "open"]
    
    if not pending:
        return jsonify({'message': 'No pending complaints'}), 200

    # Build a single message with all complaint info
    sms_lines = [f"Complaint Summary for {cust.name}:"]
    for c in pending:
        sms_lines.append(
            f"- ID: {c.complaint_id}, Issue: {c.issue_type}, "
            f"Created: {c.created_at.strftime('%d-%b-%Y')}, "
            f"ETA: {c.estimated_restoration_time or 'Not Available'}"
        )
    sms_text = "\n".join(sms_lines)

    send_sms(cust.phone, sms_text)  # Uncomment when SMS function is available

    return jsonify({
        'message': 'Pending complaints found.',
        'summary_text': sms_text,
        'pending_complaints': [{
            'complaint_id': c.complaint_id,
            'issue_type': c.issue_type,
            'status': c.status,
            'created_at': c.created_at.isoformat(),
            'estimated_restoration_time': c.estimated_restoration_time
        } for c in pending]
    }), 200
