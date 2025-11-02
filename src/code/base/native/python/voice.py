import os
import sys
import json
import wave
import tempfile
from pathlib import Path
from piper import PiperVoice

def get_temp_path():
    return Path(tempfile.gettempdir())

def synthesize_to_wav(message, wav_path, voice_path):
    voice = PiperVoice.load(str(voice_path))
    with wave.open(str(wav_path), "wb") as wav_file:
        voice.synthesize_wav(message, wav_file)
    return wav_path


def main():
    if len(sys.argv) < 3:
        sys.exit(1)

    message = sys.argv[1]
    filename = sys.argv[2]

    temp_folder = get_temp_path()
    voice_name = "en_US-kristin-medium"
    voice_file_path = Path(__file__).parent.parent.parent / "model" / "piper" / f"{voice_name}.onnx"

    wav_path = temp_folder / filename

    try:
        synthesize_to_wav(message, wav_path, voice_file_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    print(json.dumps({"filepath": str(wav_path)}))


if __name__ == "__main__":
    main()
