"""
Speech-to-text functionality using OpenAI Whisper
"""
import whisper  # type: ignore
import tempfile
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Load Whisper model - using 'base' for good balance of speed/accuracy
# Options: tiny, base, small, medium, large
try:
    model = whisper.load_model("base")
    logger.info("Whisper model loaded successfully")
except Exception as e:
    logger.error("Failed to load Whisper model: %s", str(e))
    model = None


def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    """
    Transcribe audio bytes to text using Whisper
    
    Args:
        audio_bytes: Audio data in bytes
        
    Returns:
        Transcribed text or None if failed
    """
    if model is None:
        logger.error("Whisper model not loaded")
        return None
        
    try:
        # Create temporary file for audio
        with tempfile.NamedTemporaryFile(
            suffix=".wav", delete=False
        ) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        # Transcribe using Whisper
        result = model.transcribe(
            temp_file_path,
            language="pt",  # Portuguese
            fp16=False,     # Use fp32 for better compatibility
            verbose=False
        )
        
        # Clean up temp file
        os.unlink(temp_file_path)
        
        # Extract text
        text = result.get("text", "").strip()
        
        if text:
            logger.info(
                "Audio transcribed successfully: %d characters", len(text)
            )
            return text
        else:
            logger.warning("No text transcribed from audio")
            return None
            
    except Exception as e:
        logger.error("Error transcribing audio: %s", str(e))
        return None


def is_whisper_available() -> bool:
    """Check if Whisper is available and loaded"""
    return model is not None
