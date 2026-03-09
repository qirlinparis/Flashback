from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, MessageHandler, filters

from src.config import TELEGRAM_BOT_TOKEN

WHAT_IT_CAN_DO = (
    "flashback — what it can do right now:\n\n"
    "• receive any text you send and acknowledge it\n\n"
    "that's it for now.\n\n"
    "what's being built next:\n"
    "1. store what you send (SQLite database)\n"
    "2. use AI to split multi-topic pastes into separate entries and identify the key fragment in each\n"
    "3. surface entries back to you on a spaced schedule — 1–2 per day, quietly\n"
    "4. let you respond: keep it, let it go, or not now\n\n"
    "the goal: the right thought comes back at the moment you're ready to do something new with it."
)


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Greets the user and explains what Flashback can currently do."""
    await update.message.reply_text(WHAT_IT_CAN_DO)


async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Returns the same capability overview as /start."""
    await update.message.reply_text(WHAT_IT_CAN_DO)


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

    app.add_handler(CommandHandler("start", handle_start))
    app.add_handler(CommandHandler("help", handle_help))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(MessageHandler(~filters.TEXT, handle_unknown))

    print("flashback is running.")
    app.run_polling()


if __name__ == "__main__":
    main()
