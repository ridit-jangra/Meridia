import os
import sys
import json
import subprocess
import tempfile
from pathlib import Path


def get_whisper_cli_path():
    return Path(__file__).parent.parent / "cpp" / "whisper" / "linux" / "whisper-cli"


def get_model_path():
    return Path(__file__).parent.parent.parent / "model" / "whisper" / "ggml-tiny.bin"


def transcribe_wav(wav_path):

    if not os.path.exists(wav_path):
        return {"error": f"WAV file not found: {wav_path}"}

    whisper_cli = get_whisper_cli_path()
    model_path = get_model_path()

    if not whisper_cli.exists():
        return {"error": f"whisper-cli not found at: {whisper_cli}"}

    if not model_path.exists():
        return {"error": f"Model not found at: {model_path}"}

    temp_output_dir = tempfile.mkdtemp()
    temp_output_base = os.path.join(temp_output_dir, "output")

    try:
        command = [
            str(whisper_cli),
            "-np",
            "-f",
            wav_path,
            "-m",
            str(model_path),
            "-l",
            "auto",
            "-ovtt",
            "-of",
            temp_output_base,
        ]

        result = subprocess.run(command, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            return {"error": f"Whisper transcription failed: {result.stderr}"}

        vtt_file = temp_output_base + ".vtt"

        if not os.path.exists(vtt_file):
            return {
                "error": f"VTT output file not found: {vtt_file}. Files: {os.listdir(temp_output_dir)}"
            }

        words = parse_vtt_to_words(vtt_file)

        return {"words": words}

    except subprocess.TimeoutExpired:
        return {"error": "Transcription timeout (exceeded 5 minutes)"}

    except Exception as e:
        import traceback

        return {
            "error": f"Transcription error: {str(e)}",
            "traceback": traceback.format_exc(),
        }

    finally:

        try:
            import shutil

            shutil.rmtree(temp_output_dir)
        except:
            pass


def parse_vtt_to_words(vtt_path):
    words = []

    try:
        with open(vtt_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            if "-->" in line:
                try:

                    parts = line.split("-->")
                    start_str = parts[0].strip()
                    end_str = parts[1].strip().split()[0]

                    start_time = vtt_time_to_seconds(start_str)
                    end_time = vtt_time_to_seconds(end_str)
                    total_duration = end_time - start_time

                    i += 1
                    text = ""
                    while i < len(lines) and lines[i].strip() and "-->" not in lines[i]:
                        text += lines[i].strip() + " "
                        i += 1

                    text = text.strip()

                    if text:

                        word_list = text.split()

                        if len(word_list) > 0:
                            time_per_word = total_duration / len(word_list)

                            for word_idx, word in enumerate(word_list):
                                word_start = start_time + (word_idx * time_per_word)
                                word_end = word_start + time_per_word

                                words.append(
                                    {
                                        "text": word,
                                        "start": round(word_start, 3),
                                        "end": round(word_end, 3),
                                    }
                                )

                except Exception as e:
                    ...

            i += 1

    except Exception as e:
        ...

    return words


def vtt_time_to_seconds(time_str):
    """
    Convert VTT timestamp to seconds.
    Format: HH:MM:SS.mmm or MM:SS.mmm
    """

    parts = time_str.split(":")

    if len(parts) == 3:
        hours = int(parts[0])
        minutes = int(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds

    elif len(parts) == 2:
        minutes = int(parts[0])
        seconds = float(parts[1])
        return minutes * 60 + seconds

    else:
        return 0.0


def main():
    if len(sys.argv) < 2:

        sys.exit(1)

    wav_path = sys.argv[1]

    result = transcribe_wav(wav_path)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
