const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// ========== MONGODB CONNECTION ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz';

mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// ========== SCHEMAS ==========
const questionSchema = new mongoose.Schema({
    id: Number,
    uploadOrder: Number,
    subject: String,
    chapter: String,
    topic: String,
    question: String,
    hindi: String,
    option_a: String,
    option_b: String,
    option_c: String,
    option_d: String,
    answer: String,
    source: String,
    explanation: String
});

const studentSchema = new mongoose.Schema({
    name: String,
    mobile: { type: String, unique: true },
    father: String,
    village: String,
    password: String,
    banned: { type: Boolean, default: false },
    stats: {
        totalAttempted: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        wrong: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 }
    },
    wrongQuestions: Array,
    savedQuestions: Array,
    examHistory: Array
});

const examSchema = new mongoose.Schema({
    id: Number,
    name: String,
    qCount: Number,
    time: Number,
    negative: Number,
    subject: String,
    chapter: String,
    topic: String,
    shuffle: Boolean,
    createdAt: String,
    attempts: { type: Number, default: 0 }
});

const subjectSchema = new mongoose.Schema({
    name: { type: String, unique: true }
});

const chapterSchema = new mongoose.Schema({
    subject: String,
    chapter: String
});

const topicSchema = new mongoose.Schema({
    chapter: String,
    topic: String
});

const Question = mongoose.model('Question', questionSchema);
const Student = mongoose.model('Student', studentSchema);
const Exam = mongoose.model('Exam', examSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Chapter = mongoose.model('Chapter', chapterSchema);
const Topic = mongoose.model('Topic', topicSchema);

// ========== API ROUTES ==========

// Subjects
app.get('/api/subjects', async (req, res) => {
    const subjects = await Subject.find();
    res.json(subjects.map(s => s.name));
});

app.post('/api/subjects', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const existing = await Subject.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Already exists' });
    const subject = new Subject({ name });
    await subject.save();
    res.json({ success: true });
});

// Chapters
app.get('/api/chapters', async (req, res) => {
    const chapters = await Chapter.find();
    res.json(chapters);
});

app.post('/api/chapters', async (req, res) => {
    const { subject, chapter } = req.body;
    if (!subject || !chapter) return res.status(400).json({ error: 'Subject and chapter required' });
    const existing = await Chapter.findOne({ subject, chapter });
    if (existing) return res.status(400).json({ error: 'Already exists' });
    const newChapter = new Chapter({ subject, chapter });
    await newChapter.save();
    res.json({ success: true });
});

// Topics
app.get('/api/topics', async (req, res) => {
    const topics = await Topic.find();
    res.json(topics);
});

app.post('/api/topics', async (req, res) => {
    const { chapter, topic } = req.body;
    if (!chapter || !topic) return res.status(400).json({ error: 'Chapter and topic required' });
    const existing = await Topic.findOne({ chapter, topic });
    if (existing) return res.status(400).json({ error: 'Already exists' });
    const newTopic = new Topic({ chapter, topic });
    await newTopic.save();
    res.json({ success: true });
});

// Questions
app.get('/api/questions', async (req, res) => {
    const questions = await Question.find();
    res.json(questions);
});

app.post('/api/questions', async (req, res) => {
    const { questions } = req.body;
    if (!Array.isArray(questions)) {
        return res.status(400).json({ error: 'Invalid data' });
    }
    await Question.deleteMany({});
    await Question.insertMany(questions);
    res.json({ success: true, count: questions.length });
});

// Students
app.get('/api/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});

app.post('/api/students', async (req, res) => {
    const { student } = req.body;
    if (!student || !student.mobile) {
        return res.status(400).json({ error: 'Invalid student data' });
    }
    await Student.findOneAndUpdate(
        { mobile: student.mobile },
        student,
        { upsert: true, new: true }
    );
    res.json({ success: true });
});

app.post('/api/students/:mobile/performance', async (req, res) => {
    const { stats, wrongQuestions, savedQuestions } = req.body;
    const student = await Student.findOne({ mobile: req.params.mobile });
    if (!student) return res.status(404).json({ error: 'Student not found' });
    if (stats) student.stats = stats;
    if (wrongQuestions) student.wrongQuestions = wrongQuestions;
    if (savedQuestions) student.savedQuestions = savedQuestions;
    await student.save();
    res.json({ success: true });
});

app.delete('/api/students/:mobile', async (req, res) => {
    await Student.deleteOne({ mobile: req.params.mobile });
    res.json({ success: true });
});

// Exams
app.get('/api/exams', async (req, res) => {
    const exams = await Exam.find();
    res.json(exams);
});

app.post('/api/exams', async (req, res) => {
    const exam = new Exam(req.body);
    await exam.save();
    res.json({ success: true });
});

app.delete('/api/exams/:id', async (req, res) => {
    await Exam.deleteOne({ id: parseInt(req.params.id) });
    res.json({ success: true });
});

// Backup
app.get('/api/backup', async (req, res) => {
    const questions = await Question.find();
    const students = await Student.find();
    const exams = await Exam.find();
    const subjects = await Subject.find();
    const chapters = await Chapter.find();
    const topics = await Topic.find();
    res.json({ questions, students, exams, subjects, chapters, topics });
});

app.post('/api/restore', async (req, res) => {
    const { questions, students, exams, subjects, chapters, topics } = req.body;
    if (questions) { await Question.deleteMany({}); await Question.insertMany(questions); }
    if (students) { await Student.deleteMany({}); await Student.insertMany(students); }
    if (exams) { await Exam.deleteMany({}); await Exam.insertMany(exams); }
    if (subjects) { await Subject.deleteMany({}); await Subject.insertMany(subjects); }
    if (chapters) { await Chapter.deleteMany({}); await Chapter.insertMany(chapters); }
    if (topics) { await Topic.deleteMany({}); await Topic.insertMany(topics); }
    res.json({ success: true });
});

// ========== SERVE FRONTEND ==========
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});
