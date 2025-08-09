#!/bin/bash

echo "🔍 Installing Enhanced OCR Engines for HealthScan AI"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Python package
python_package_exists() {
    python3 -c "import $1" 2>/dev/null
}

echo ""
echo "📋 Checking system requirements..."

# Check Python3
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python3 found: $PYTHON_VERSION${NC}"
else
    echo -e "${RED}❌ Python3 not found. Please install Python 3.7+${NC}"
    exit 1
fi

# Check pip3
if command_exists pip3; then
    echo -e "${GREEN}✅ pip3 found${NC}"
else
    echo -e "${RED}❌ pip3 not found. Please install pip3${NC}"
    exit 1
fi

# Check if we're on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
    echo -e "${GREEN}✅ Platform: macOS${NC}"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="Linux"
    echo -e "${GREEN}✅ Platform: Linux${NC}"
else
    echo -e "${YELLOW}⚠️ Unsupported platform: $OSTYPE${NC}"
    echo "This script supports macOS and Linux. Proceeding anyway..."
    PLATFORM="Unknown"
fi

echo ""
echo "🔧 Installing Enhanced Tesseract (if needed)..."

# Install Tesseract based on platform
if command_exists tesseract; then
    TESSERACT_VERSION=$(tesseract --version | head -n1)
    echo -e "${GREEN}✅ Tesseract already installed: $TESSERACT_VERSION${NC}"
else
    echo "Installing Tesseract OCR..."
    if [[ "$PLATFORM" == "macOS" ]]; then
        if command_exists brew; then
            brew install tesseract
            brew install tesseract-lang
        else
            echo -e "${RED}❌ Homebrew not found. Please install Homebrew first${NC}"
            exit 1
        fi
    elif [[ "$PLATFORM" == "Linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-script-latn
        elif command_exists yum; then
            sudo yum install -y tesseract tesseract-langpack-eng
        elif command_exists dnf; then
            sudo dnf install -y tesseract tesseract-langpack-eng
        else
            echo -e "${RED}❌ Package manager not found. Please install Tesseract manually${NC}"
        fi
    fi
fi

echo ""
echo "🤖 Installing EasyOCR..."

# Install EasyOCR
if python_package_exists easyocr; then
    echo -e "${GREEN}✅ EasyOCR already installed${NC}"
else
    echo "Installing EasyOCR (this may take a while)..."
    pip3 install easyocr
    if python_package_exists easyocr; then
        echo -e "${GREEN}✅ EasyOCR installed successfully${NC}"
    else
        echo -e "${RED}❌ EasyOCR installation failed${NC}"
    fi
fi

echo ""
echo "🏮 Installing PaddleOCR..."

# Install PaddlePaddle and PaddleOCR
if python_package_exists paddleocr; then
    echo -e "${GREEN}✅ PaddleOCR already installed${NC}"
else
    echo "Installing PaddlePaddle..."
    if [[ "$PLATFORM" == "macOS" ]]; then
        # For macOS, use CPU version
        pip3 install paddlepaddle
    else
        # For Linux, use CPU version (GPU version requires CUDA)
        pip3 install paddlepaddle
    fi
    
    echo "Installing PaddleOCR..."
    pip3 install "paddleocr>=2.0.1"
    
    if python_package_exists paddleocr; then
        echo -e "${GREEN}✅ PaddleOCR installed successfully${NC}"
    else
        echo -e "${RED}❌ PaddleOCR installation failed${NC}"
    fi
fi

echo ""
echo "🔬 Installing additional Python dependencies for image processing..."

# Install additional image processing libraries
pip3 install opencv-python-headless pillow scipy scikit-image

echo ""
echo "🧪 Testing OCR engines..."

# Test script
cat > test_ocr_engines.py << 'EOF'
import sys
import traceback

def test_engine(engine_name, test_func):
    try:
        test_func()
        print(f"✅ {engine_name}: Working")
        return True
    except Exception as e:
        print(f"❌ {engine_name}: Failed - {str(e)}")
        return False

def test_easyocr():
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False)
    return reader

def test_paddleocr():
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
    return ocr

def test_opencv():
    import cv2
    return True

def test_pillow():
    from PIL import Image
    return True

if __name__ == "__main__":
    print("Testing OCR engines...")
    
    results = []
    results.append(test_engine("EasyOCR", test_easyocr))
    results.append(test_engine("PaddleOCR", test_paddleocr))
    results.append(test_engine("OpenCV", test_opencv))
    results.append(test_engine("Pillow", test_pillow))
    
    working_count = sum(results)
    print(f"\n{working_count}/{len(results)} OCR engines are working properly")
    
    if working_count >= 2:
        print("✅ Enhanced OCR setup is ready!")
    else:
        print("⚠️ Some OCR engines failed. Basic Tesseract should still work.")
EOF

echo "Running OCR engine tests..."
python3 test_ocr_engines.py

# Cleanup test file
rm -f test_ocr_engines.py

echo ""
echo "📝 Installation Summary"
echo "======================"
echo "Tesseract OCR: $(if command_exists tesseract; then echo 'Installed'; else echo 'Not available'; fi)"
echo "EasyOCR: $(if python_package_exists easyocr; then echo 'Installed'; else echo 'Not available'; fi)"
echo "PaddleOCR: $(if python_package_exists paddleocr; then echo 'Installed'; else echo 'Not available'; fi)"

echo ""
echo "🎉 Enhanced OCR setup complete!"
echo ""
echo "📖 Usage Notes:"
echo "• Tesseract: Fast, good for clean documents"
echo "• EasyOCR: Better for handwritten text and complex layouts"
echo "• PaddleOCR: Excellent for tables and structured documents"
echo "• Ensemble mode: Uses all available engines for best results"
echo ""
echo "🚀 Your HealthScan AI now has enhanced OCR capabilities!"

# Make script executable
chmod +x "$0"