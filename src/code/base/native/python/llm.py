import ollama
import json
import sys
import os
from pathlib import Path


def get_default_messages_path():
    if os.name == 'nt':  
        public_folder = os.getenv('APPDATA')
    else:  
        public_folder = os.path.join(os.getenv('HOME', ''), '.config')
    
    meridia_folder = os.path.join(public_folder, 'Meridia')
    user_folder = os.path.join(meridia_folder, 'User')
    return os.path.join(user_folder, 'messages.json')

messages = []


def load_messages(filename=None):
    if filename is None:
        filename = get_default_messages_path()
    
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Could not load messages from {filename} - {e}")
            return []
    return []


def save_messages(filename=None):
    if filename is None:
        filename = get_default_messages_path()
    
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    try:
        with open(filename, 'w') as f:
            json.dump(messages, f, indent=4)
    except IOError as e:
        print(f"Error saving messages to {filename}: {e}")


def chat_with_model(user_message, max_tokens=50, filename=None):    
    system_prompt = """You are Mira., integrated with Meridia code editor. British tone: calm, witty, efficient. For greetings like 'hello', reply very short: 'Hello, sir' or 'Hey, sir'. No questions or chit-chat. Use 'Yes, sir' or 'Certainly, sir' for commands. Under 50 words always, plain words, no repetition, no markdown. Assist immediately in any situation: control Meridia to change settings, customize themes, create/delete/edit files, perform file system actions, generate code, and vibe with user on coding tasks."""
    
    global messages
    
    if not messages:
        messages = load_messages(filename)
    
    if not messages or messages[0].get('role') != 'system':
        messages.insert(0, {'role': 'system', 'content': system_prompt})

    try:
        messages.append({
            'role': 'user',
            'content': user_message,
        })
        
        response = ollama.chat(
            model="llama3.1", 
            messages=messages,
            options={'num_predict': max_tokens} 
        )
        
        model_response = response['message']['content'].strip()
        
        messages.append({
            'role': 'assistant',
            'content': model_response,
        })
        
        
        save_messages(filename)
        
        return model_response
    
    except Exception as e:
        
        save_messages(filename)
        return f"Error: {e}"


if __name__ == "__main__":
    filename = None
    if len(sys.argv) > 1:
        i = 1
        if sys.argv[1] == '--config' and len(sys.argv) > 2:
            filename = sys.argv[2]
            i = 3
        message = sys.argv[i] if i < len(sys.argv) else None
        
        if message:
            response = chat_with_model(message, filename=filename)
            print(json.dumps({"text": str(response)}))
        else:
            print(json.dumps({"text": "No message provided"}))
    else:
        print(json.dumps({"text": "No message provided"}))
