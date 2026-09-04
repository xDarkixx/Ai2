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
    std::cout << "[SYSTEM] Local native engine\n";
#if defined(_WIN32)
    std::cout << "[SYSTEM] Platform: Windows\n";
#elif defined(__linux__)
    std::cout << "[SYSTEM] Platform: Linux\n";
#elif defined(__APPLE__)
    std::cout << "[SYSTEM] Platform: macOS\n";
#else
    std::cout << "[SYSTEM] Platform: unknown\n";
#endif
#if defined(__AVX2__)
    std::cout << "[SYSTEM] CPU feature: AVX2 detected\n";
#endif
#if defined(__CUDACC__)
    std::cout << "[SYSTEM] CUDA compilation enabled\n";
#else
    std::cout << "[SYSTEM] CUDA: use a CUDA-enabled build for GPU inference\n";
#endif
    std::cout << "\n";
}

} // namespace ai2::native

int main() {
    using namespace ai2::native;

    std::cout << "============================================================\n";
    std::cout << "   Ai2 LOCAL AI ENGINE                                      \n";
    std::cout << "   Native runtime / model adapter scaffold                  \n";
    std::cout << "============================================================\n\n";

    print_hardware_info();
    load_component("Model runtime", 500);
    load_component("Tokenizer / prompt adapter", 300);
    load_component("Media adapter interface", 300);

    std::cout << "[OK] Native engine initialized.\n";
    std::cout << "This binary provides the local-runtime integration point for Ai2.\n";
    std::cout << "Connect a supported local model/runtime in the adapter layer.\n";

    return EXIT_SUCCESS;
}
