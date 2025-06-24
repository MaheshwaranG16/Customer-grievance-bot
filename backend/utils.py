import random
import string
from datetime import datetime
from twilio.rest import Client

# Twilio Credentials
TWILIO_ACCOUNT_SID = 'AC6544420d42d8e8cf1f84b6352323e5bd'
TWILIO_AUTH_TOKEN = 'e4b0cf64666df8079fde04bbb68be6ef'
TWILIO_PHONE_NUMBER = '+16408671356'
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def gen_complaint_id():
    return 'CMP-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def send_sms(to, body):
    client.messages.create(
        body=body,
        from_=TWILIO_PHONE_NUMBER,
        to=to
    )