import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Инициализация бота и диспетчера
API_TOKEN = '8185828821:AAF8SNIaRLbNppARjeEOT78zfPw9AznfID0'  # Замените на токен от @BotFather
bot = Bot(token=API_TOKEN)
dp = Dispatcher()

# Пример квиза (можно добавить больше квизов)
quizzes = {
    "general_knowledge": [
        {
            "question": "Какой город является столицей Франции?",
            "options": ["Париж", "Лондон", "Берлин", "Мадрид"],
            "correct": 0
        },
        {
            "question": "Какой химический элемент обозначается символом 'O'?",
            "options": ["Золото", "Кислород", "Водород", "Азот"],
            "correct": 1
        }
    ],
    "science": [
        {
            "question": "Что такое фотосинтез?",
            "options": ["Процесс дыхания", "Процесс поглощения света растениями", "Процесс деления клеток", "Процесс горения"],
            "correct": 1
        }
    ]
}

# Хранилище состояния пользователей
user_data = {}

# Обработчик команды /start
@dp.message(Command("start"))
async def send_welcome(message: types.Message):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Общие знания", callback_data="quiz_general_knowledge")],
        [InlineKeyboardButton(text="Наука", callback_data="quiz_science")]
    ])
    await message.reply("Добро пожаловать! Выберите тему квиза:", reply_markup=keyboard)

# Обработчик выбора квиза
@dp.callback_query(lambda c: c.data.startswith("quiz_"))
async def process_quiz_selection(callback_query: types.CallbackQuery):
    quiz_id = callback_query.data.split("_")[1]
    user_id = callback_query.from_user.id
    user_data[user_id] = {"quiz_id": quiz_id, "current_question": 0, "score": 0}
    
    await send_question(user_id, callback_query.message.chat.id)
    await callback_query.answer()

# Отправка вопроса пользователю
async def send_question(user_id, chat_id):
    quiz_id = user_data[user_id]["quiz_id"]
    current_question = user_data[user_id]["current_question"]
    
    if current_question < len(quizzes[quiz_id]):
        question_data = quizzes[quiz_id][current_question]
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text=option, callback_data=f"answer_{i}")]
            for i, option in enumerate(question_data["options"])
        ])
        await bot.send_message(chat_id, question_data["question"], reply_markup=keyboard)
    else:
        score = user_data[user_id]["score"]
        total = len(quizzes[quiz_id])
        await bot.send_message(chat_id, f"Квиз завершен! Ваш результат: {score}/{total}")
        del user_data[user_id]

# Обработчик ответа
@dp.callback_query(lambda c: c.data.startswith("answer_"))
async def process_answer(callback_query: types.CallbackQuery):
    user_id = callback_query.from_user.id
    if user_id not in user_data:
        await callback_query.message.reply("Пожалуйста, начните квиз заново с помощью /start")
        return
    
    quiz_id = user_data[user_id]["quiz_id"]
    current_question = user_data[user_id]["current_question"]
    correct_answer = quizzes[quiz_id][current_question]["correct"]
    user_answer = int(callback_query.data.split("_")[1])
    
    if user_answer == correct_answer:
        user_data[user_id]["score"] += 1
        await callback_query.message.reply("Правильно!")
    else:
        correct_option = quizzes[quiz_id][current_question]["options"][correct_answer]
        await callback_query.message.reply(f"Неправильно! Правильный ответ: {correct_option}")
    
    user_data[user_id]["current_question"] += 1
    await send_question(user_id, callback_query.message.chat.id)
    await callback_query.answer()

# Запуск бота
async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())