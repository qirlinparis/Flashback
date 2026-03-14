from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, CommandHandler, ContextTypes,
    MessageHandler, CallbackQueryHandler, filters,
)

from src.config import TELEGRAM_BOT_TOKEN
from src.database import (
    init_db, get_or_create_user, get_due_fragments,
    log_interaction, update_review_state, fragment_belongs_to_user,
)
from src.ingestion import ingest

WHAT_IT_CAN_DO = (
    "flashback — what it can do right now:\n\n"
    "• send any text → stored and split into entries\n"
    "• /review → surfaces 1–2 fragments due today\n"
    "• keep it / not now / let go → updates your schedule\n\n"
    "the goal: the right thought comes back at the moment you're ready to do something new with it."
)


async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WHAT_IT_CAN_DO)


async def handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WHAT_IT_CAN_DO)


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive text → LLM processes → entries/fragments stored."""
    telegram_id = update.effective_user.id
    user = get_or_create_user(telegram_id)
    text = update.message.text

    stored = ingest(user_id=user["id"], text=text)
    entry_count = len(stored)
    fragment_count = sum(len(s["fragment_ids"]) for s in stored)

    await update.message.reply_text(
        f"received. {entry_count} {'entry' if entry_count == 1 else 'entries'}, "
        f"{fragment_count} {'fragment' if fragment_count == 1 else 'fragments'}."
    )


async def send_fragment(update, frag):
    """Send one fragment as a message with keep / not now / let go buttons."""
    text = frag["text"]
    if frag["review_count"] > 0:
        text += f"\n\n— reviewed {frag['review_count']}×"

    keyboard = InlineKeyboardMarkup([[
        InlineKeyboardButton("keep",    callback_data=f"keep:{frag['id']}"),
        InlineKeyboardButton("not now", callback_data=f"not_now:{frag['id']}"),
        InlineKeyboardButton("let go",  callback_data=f"let_go:{frag['id']}"),
    ]])
    await update.message.reply_text(text, reply_markup=keyboard)


async def handle_review(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/review — surfaces fragments due today for this user."""
    user = get_or_create_user(update.effective_user.id)
    fragments = get_due_fragments(user["id"], limit=2)

    if not fragments:
        await update.message.reply_text("nothing for today. check back tomorrow.")
        return

    for frag in fragments:
        await send_fragment(update, frag)


async def handle_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles keep / not_now / let_go button taps."""
    query = update.callback_query
    await query.answer()

    action, fragment_id_str = query.data.split(":")
    fragment_id = int(fragment_id_str)

    user = get_or_create_user(query.from_user.id)
    if not fragment_belongs_to_user(fragment_id, user["id"]):
        await query.edit_message_text("not your fragment.")
        return

    log_interaction(user_id=user["id"], fragment_id=fragment_id, action=action)
    update_review_state(fragment_id, action)

    responses = {
        "keep":    "held close.",
        "not_now": "it'll come back.",
        "let_go":  "archived.",
    }
    original_text = query.message.text
    await query.edit_message_text(original_text + f"\n\n{responses[action]}")


async def handle_unknown(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("send text only for now.")


def main():
    init_db()
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start",  handle_start))
    app.add_handler(CommandHandler("help",   handle_help))
    app.add_handler(CommandHandler("review", handle_review))
    app.add_handler(CallbackQueryHandler(handle_action))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(MessageHandler(~filters.TEXT, handle_unknown))

    print("flashback bot is running.")
    app.run_polling()


if __name__ == "__main__":
    main()
