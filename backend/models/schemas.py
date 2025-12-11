from pydantic import BaseModel

class TopicRequest(BaseModel):
    topic: str
    mode: str            # Easy, Medium, Hard
    cognitive_level: str
    num_questions: int

class PassageRequest(BaseModel):
    passage: str
    mode: str
    cognitive_level: str    
    num_questions: int

class WebpageRequest(BaseModel):
    url: str
    mode: str
    cognitive_level: str
    num_questions: int

class ExplainRequest(BaseModel):
    question: str
    user_answer: str
    correct_answer: str
