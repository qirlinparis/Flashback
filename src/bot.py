from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters

from src.config import TELEGRAM_BOT_TOKEN


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Called every time the user sends a text message.
    For now: just acknowledges receipt.
    Next step: pass text to ingestion pipeline.
    """
    text = update.message.text
    await update.message.reply_text("received.")


async def handle_unknown(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Called for non-text messages (photos, voice, etc.)."""
    await update.message.reply_text("send text only for now.")


def main():
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(MessageHandler(~filters.TEXT, handle_unknown))

    print("flashback is running.")
    app.run_polling()


if __name__ == "__main__":
    main()
