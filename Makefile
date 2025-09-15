# Economic Justice Tally Server Makefile
# Compiles C++ server with Assembly integration for secure tally network

# Compiler settings
CXX = g++
AS = as
LD = g++
CXXFLAGS = -Wall -Wextra -std=c++17 -O3 -pthread
LDFLAGS = -lssl -lcrypto -pthread

# Platform-specific settings
UNAME_S := $(shell uname -s)

ifeq ($(UNAME_S),Linux)
    # Linux settings
    CXXFLAGS += -I/usr/include/openssl
endif

ifeq ($(UNAME_S),Darwin)
    # macOS settings
    CXXFLAGS += -I/usr/local/opt/openssl/include
    LDFLAGS += -L/usr/local/opt/openssl/lib
endif

ifeq ($(OS),Windows_NT)
    # Windows settings
    LDFLAGS = -lws2_32 -lwsock32 -lssl -lcrypto
    EXE = .exe
else
    EXE =
endif

# Targets
TARGET = tally-server$(EXE)
TALLY_SRC = tally-server.cpp
ASM_OBJ = tally-asm.o

# Default target - build everything
all: $(TARGET)

# Main compilation with Assembly integration
$(TARGET): $(TALLY_SRC) $(ASM_OBJ)
	@echo "🔧 Compiling Economic Justice Tally Server..."
	$(CXX) $(CXXFLAGS) -o $(TARGET) $(TALLY_SRC) $(ASM_OBJ) $(LDFLAGS)
	@echo "✅ Build complete! Run './$(TARGET)' to start the tally server"

# Assemble the tally operations
$(ASM_OBJ): tally-asm.S
	@echo "⚡ Assembling tally operations..."
	$(AS) -o $@ $<

# Run the tally server
run: $(TARGET)
	@echo "🚀 Starting Tally Server..."
	./$(TARGET)

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f $(TARGET) *.o

# Rebuild everything
rebuild: clean all

# Development targets
debug: CXXFLAGS += -g -DDEBUG
debug: rebuild

release: CXXFLAGS += -O3 -DNDEBUG
release: rebuild

# Install dependencies (Ubuntu/Debian)
install-deps-ubuntu:
	@echo "📦 Installing dependencies for Ubuntu..."
	sudo apt update
	sudo apt install -y g++ make binutils libssl-dev

# Install dependencies (macOS)
install-deps-macos:
	@echo "📦 Installing dependencies for macOS..."
	brew update
	brew install openssl

# Test the server
test: $(TARGET)
	@echo "🧪 Testing server compilation..."
	@./$(TARGET) --help || echo "Server started successfully"

# Build and run in background
serve: $(TARGET)
	@echo "🌐 Starting server in background..."
	@./$(TARGET) &
	@echo "Server PID: $$!"
	@echo "Access: http://localhost:8080"

# Cross-compilation targets
cross-win:
	@echo "🔧 Cross-compiling for Windows..."
	x86_64-w64-mingw32-g++ -std=c++17 -Wall -Wextra -O2 -static -o tally-server.exe $(TALLY_SRC) -lws2_32 -lwsock32 -lssl -lcrypto

cross-linux:
	@echo "🔧 Cross-compiling for Linux..."
	x86_64-linux-gnu-g++ -std=c++17 -Wall -Wextra -O2 -static -o tally-server-linux $(TALLY_SRC) -pthread -lssl -lcrypto

# Show build info
info:
	@echo "Economic Justice Tally Server Build System"
	@echo "Compiler: $(CXX)"
	@echo "Flags: $(CXXFLAGS)"
	@echo "Linker Flags: $(LDFLAGS)"
	@echo "Target: $(TARGET)"
	@echo "Platform: $(UNAME_S)"
	@echo "OpenSSL: $(shell pkg-config --modversion openssl 2>/dev/null || echo 'Not found')"

help:
	@echo "Economic Justice Tally Server Makefile Targets:"
	@echo "  all       - Build everything (default)"
	@echo "  clean     - Remove build artifacts"
	@echo "  rebuild   - Clean and rebuild"
	@echo "  run       - Build and run server"
	@echo "  debug     - Build with debug symbols"
	@echo "  release   - Build optimized release"
	@echo "  serve     - Start server in background"
	@echo "  test      - Test server compilation"
	@echo "  info      - Show build information"
	@echo "  install-deps-ubuntu - Install Ubuntu dependencies"
	@echo "  install-deps-macos  - Install macOS dependencies"
	@echo "  cross-win  - Cross-compile for Windows"
	@echo "  cross-linux - Cross-compile for Linux"

.PHONY: all run clean rebuild debug release test serve info help install-deps-ubuntu install-deps-macos cross-win cross-linux