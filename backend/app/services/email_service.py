"""
Email service for SmartAttend.
Sends transactional emails via SMTP (attendance alerts, password resets, leave status).
Falls back to mock logging if SMTP credentials are not configured.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..core.config import settings

logger = logging.getLogger(__name__)

SMTP_SERVER = settings.SMTP_HOST
SMTP_PORT = settings.SMTP_PORT
SMTP_USERNAME = settings.SMTP_USER
SMTP_PASSWORD = settings.SMTP_PASSWORD
INSTITUTION_NAME = settings.INSTITUTION_NAME


def _send_email(to_email: str, subject: str, body: str):
    """Internal helper to send an email."""
    if not to_email:
        logger.debug(f"Skipping email: No email address provided.")
        return

    if not SMTP_SERVER or not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.info(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
        logger.debug(f"Body: {body}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, to_email, msg.as_string())
        server.quit()
        logger.info(f"Email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")


def send_attendance_email(to_email: str, student_name: str, status: str, date_str: str):
    """Send attendance status notification email."""
    subject = f"Attendance Update - {date_str}"
    body = (
        f"Dear {student_name},\n\n"
        f"You have been marked as {status} for the class on {date_str}.\n\n"
        f"Regards,\n{INSTITUTION_NAME}"
    )
    _send_email(to_email, subject, body)


def send_low_attendance_alert(to_email: str, student_name: str, percentage: float, threshold: float):
    """Send low attendance warning email."""
    subject = f"Low Attendance Warning - {INSTITUTION_NAME}"
    body = (
        f"Dear {student_name},\n\n"
        f"Your current attendance is {percentage:.1f}%, which is below the required threshold of {threshold:.0f}%.\n\n"
        f"Please ensure regular attendance to avoid academic penalties.\n\n"
        f"Regards,\n{INSTITUTION_NAME}"
    )
    _send_email(to_email, subject, body)


def send_password_reset_notification(to_email: str, name: str):
    """Send password reset notification."""
    subject = f"Password Reset - {INSTITUTION_NAME}"
    body = (
        f"Dear {name},\n\n"
        f"Your password has been reset by an administrator. "
        f"Please log in with your new credentials and change your password immediately.\n\n"
        f"Regards,\n{INSTITUTION_NAME}"
    )
    _send_email(to_email, subject, body)


def send_leave_status_email(to_email: str, student_name: str, status: str, from_date: str, to_date: str):
    """Send leave request status update email."""
    subject = f"Leave Request {status.capitalize()} - {INSTITUTION_NAME}"
    body = (
        f"Dear {student_name},\n\n"
        f"Your leave request from {from_date} to {to_date} has been {status}.\n\n"
        f"Regards,\n{INSTITUTION_NAME}"
    )
    _send_email(to_email, subject, body)
