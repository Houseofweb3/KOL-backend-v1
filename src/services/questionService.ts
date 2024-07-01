import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../data-source';
import { Admin } from '../entity/Admin';
import { Question } from '../entity/Question';
import { Option } from '../entity/Option';

interface OptionData {
  text: string;
  reference?: string;
}

interface CreateQuestionData {
  admin_id: string;
  question: string;
  options: OptionData[];
}

interface UpdateQuestionData {
  question_id: string;
  admin_id: string;
  question: string;
  options: OptionData[];
}

export const createQuestion = async ({ admin_id, question, options }: CreateQuestionData) => {
  const adminRepository = AppDataSource.getRepository(Admin);
  const questionRepository = AppDataSource.getRepository(Question);
  const optionRepository = AppDataSource.getRepository(Option);

  const admin = await adminRepository.findOne({ where: { id: admin_id } });

  if (!admin) {
    throw new Error('Admin not found');
  }

  if (admin.status !== 'active') {
    throw new Error('Admin is not active');
  }

  const createdBy = admin.fullname;

  const existingQuestion = await questionRepository.findOne({
    where: {
      admin_id,
      text: question,
    },
  });

  if (existingQuestion) {
    throw new Error('Question already exists for the admin');
  }

  const newQuestion = questionRepository.create({
    id: uuidv4(),
    admin_id,
    text: question,
    createdBy,
    updatedBy: createdBy,
  });

  await questionRepository.save(newQuestion);

  const newOptions = options.map(opt => ({
    id: uuidv4(),
    admin_id,
    question_id: newQuestion.id,
    text: opt.text,
    reference: opt.reference,
    createdBy,
    updatedBy: createdBy,
    question: newQuestion,
  }));

  await optionRepository.save(newOptions);

  return newQuestion;
};

export const getQuestionsWithOptions = async () => {
  const questionRepository = AppDataSource.getRepository(Question);
  return questionRepository.find({ relations: ['options'] });
};

export const updateQuestion = async ({ question_id, admin_id, question, options }: UpdateQuestionData) => {
  const adminRepository = AppDataSource.getRepository(Admin);
  const questionRepository = AppDataSource.getRepository(Question);
  const optionRepository = AppDataSource.getRepository(Option);

  const admin = await adminRepository.findOne({ where: { id: admin_id } });

  if (!admin) {
    throw new Error('Admin not found');
  }

  if (admin.status !== 'active') {
    throw new Error('Admin is not active');
  }

  const updatedBy = admin.fullname;

  const existingQuestion = await questionRepository.findOne({ where: { id: question_id } });

  if (!existingQuestion) {
    throw new Error('Question not found');
  }

  if (existingQuestion.admin_id !== admin_id) {
    throw new Error('Admin does not have permission to update this question');
  }

  existingQuestion.text = question;
  existingQuestion.updatedBy = updatedBy;

  await questionRepository.save(existingQuestion);

  await optionRepository.delete({ question_id });

  const newOptions = options.map(opt => ({
    id: uuidv4(),
    admin_id,
    question_id: question_id,
    text: opt.text,
    reference: opt.reference,
    createdBy: updatedBy,
    updatedBy: updatedBy,
    question: existingQuestion,
  }));

  await optionRepository.save(newOptions);

  return existingQuestion;
};

export const deleteQuestion = async (question_id: string, admin_id: string) => {
  const adminRepository = AppDataSource.getRepository(Admin);
  const questionRepository = AppDataSource.getRepository(Question);
  const optionRepository = AppDataSource.getRepository(Option);

  const admin = await adminRepository.findOne({ where: { id: admin_id } });

  if (!admin) {
    throw new Error('Admin not found');
  }

  if (admin.status !== 'active') {
    throw new Error('Admin is not active');
  }

  const question = await questionRepository.findOne({ where: { id: question_id } });

  if (!question) {
    throw new Error('Question not found');
  }

  if (question.admin_id !== admin_id) {
    throw new Error('Admin does not have permission to delete this question');
  }

  await optionRepository.delete({ question_id });

  await questionRepository.delete({ id: question_id });

  return { message: 'Question and its options deleted successfully' };
};
