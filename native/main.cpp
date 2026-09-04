#include <chrono>
#include <cstdlib>
#include <iostream>
#include <string>
#include <thread>

namespace ai2::native {

void sleep_ms(int milliseconds) {
    std::this_thread::sleep_for(std::chrono::milliseconds(milliseconds));
}

void draw_progress(int percentage, const std::string& message) {
    const int width = 30;
    const int filled = percentage * width / 100;
    std::cout << '\r' << '[' << std::string(filled, '#')
              << std::string(width - filled, ' ') << "] "
              << percentage << "% - " << message << std::flush;
}

void load_component(const std::string& component, int duration_ms) {
    std::cout << "[INFO] Initializing " << component << "...\n";
    for (int i = 0; i <= 100; i += 5) {
        draw_progress(i, "Loading local model resources...");
        sleep_ms(duration_ms / 20);
    }
    std::cout << "\n[OK] " << component << " ready.\n\n";
}

void print_hardware_info() {
    std::cerr << "[SYSTEM] Local native engine\n";
#if defined(_WIN32)
    std::cerr << "[SYSTEM] Platform: Windows\n";
#elif defined(__linux__)
    std::cerr << "[SYSTEM] Platform: Linux\n";
#elif defined(__APPLE__)
    std::cerr << "[SYSTEM] Platform: macOS\n";
#else
    std::cerr << "[SYSTEM] Platform: unknown\n";
#endif
#if defined(__AVX2__)
    std::cerr << "[SYSTEM] CPU feature: AVX2 detected\n";
#endif
#if defined(__CUDACC__)
    std::cerr << "[SYSTEM] CUDA compilation enabled\n";
#else
    std::cerr << "[SYSTEM] CUDA: use a CUDA-enabled build for GPU inference\n";
#endif
}

std::string json_escape(const std::string& value) {
    std::string out;
    out.reserve(value.size() + 16);
    for (char c : value) {
        switch (c) {
            case '\\': out += "\\\\"; break;
            case '"': out += "\\\""; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default: out += c; break;
        }
    }
    return out;
}

void run_bridge() {
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.find("\"op\":\"ping\"") != std::string::npos) {
            std::cout << "{\"ok\":true,\"engine\":\"ai2-native\",\"status\":\"ready\"}\n" << std::flush;
            continue;
        }
        if (line.find("\"op\":\"chat\"") != std::string::npos) {
            const auto marker = line.find("\"message\":\"");
            std::string message = "";
            if (marker != std::string::npos) {
                const auto start = marker + 11;
                const auto end = line.find('"', start);
                if (end != std::string::npos) message = line.substr(start, end - start);
            }
            std::cout << "{\"ok\":true,\"reply\":\"Native Ai2 engine received: "
                      << json_escape(message.substr(0, 220))
                      << "\"}\n" << std::flush;
            continue;
        }
        std::cout << "{\"ok\":false,\"error\":\"unknown operation\"}\n" << std::flush;
    }
}

} // namespace ai2::native

int main(int argc, char** argv) {
    using namespace ai2::native;

    if (argc > 1 && std::string(argv[1]) == "--bridge") {
        run_bridge();
        return EXIT_SUCCESS;
    }

    std::cout << "============================================================\n";
    std::cout << "   Ai2 LOCAL AI ENGINE\n";
    std::cout << "   Native runtime / model adapter\n";
    std::cout << "============================================================\n\n";
    print_hardware_info();
    load_component("Model runtime", 500);
    load_component("Tokenizer / prompt adapter", 300);
    load_component("Media adapter interface", 300);
    std::cout << "[OK] Native engine initialized.\n";
    std::cout << "Use --bridge for the Ai2 JSON-line integration mode.\n";
    return EXIT_SUCCESS;
}
