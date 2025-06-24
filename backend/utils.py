import random
import string
from datetime import datetime
from twilio.rest import Client

# Twilio Credentials
TWILIO_ACCOUNT_SID = 'Your_Twilio_Account_SID'
TWILIO_AUTH_TOKEN = 'Your_Twilio_Auth_Token'
TWILIO_PHONE_NUMBER = 'Your_Twilio_Phone_Number'
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

def gen_complaint_id():
    return 'CMP-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def send_sms(to, body):
    client.messages.create(
        body=body,
        from_=TWILIO_PHONE_NUMBER,
        to=to
    )