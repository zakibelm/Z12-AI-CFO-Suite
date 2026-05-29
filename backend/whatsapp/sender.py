import os
import logging
from twilio.rest import Client

logger = logging.getLogger(__name__)
_client = None

def get_client():
    global _client
    if _client is None:
        _client = Client(
            os.environ["TWILIO_ACCOUNT_SID"],
            os.environ["TWILIO_AUTH_TOKEN"]
        )
    return _client

async def send_message(phone: str, text: str) -> bool:
    try:
        get_client().messages.create(
            from_=os.environ["TWILIO_WHATSAPP_FROM"],
            body=text,
            to=f"whatsapp:{phone}"
        )
        return True
    except Exception as e:
        logger.error(f"send_message failed: {e}")
        return False

async def send_alert(phone: str, alert_type: str, data: dict) -> bool:
    templates = {
        "tresorerie_critique": "Alerte Tresorerie Z12\nVotre tresorerie necessite attention. Connectez-vous sur cfo.optigenius.pro",
        "rappel_fiscal": "Rappel Fiscal Z12\nEcheance fiscale a venir. Consultez Sophie sur cfo.optigenius.pro",
        "rag_termine": f"Z12 - Indexation terminee\n{data.get('count', 0)} document(s) indexe(s).",
        "anomalie": "Z12 - Anomalie detectee\nConsultez Alexandre sur cfo.optigenius.pro",
    }
    message = templates.get(alert_type, f"Z12 AI CFO - {alert_type}")
    return await send_message(phone, message)
