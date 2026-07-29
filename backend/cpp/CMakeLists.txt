cmake_minimum_required(VERSION 3.15)
project(native_solver_core VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find JNI
find_package(JNI REQUIRED)

message(STATUS "JNI Include Directories: ${JNI_INCLUDE_DIRS}")
message(STATUS "JNI Libraries: ${JNI_LIBRARIES}")

# Shared Library Target
add_library(native_solver_core SHARED
    src/com_airesearch_puzzleplatform_solver_NativeSolverBridge.cpp
)

# Include directories
target_include_directories(native_solver_core PRIVATE
    ${JNI_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Link JNI libraries
target_link_libraries(native_solver_core PRIVATE ${JNI_LIBRARIES})

# Compiler flags
if(WIN32)
    target_compile_options(native_solver_core PRIVATE /O2 /W4)
    set_target_properties(native_solver_core PROPERTIES
        PREFIX ""
        SUFFIX ".dll"
    )
else()
    target_compile_options(native_solver_core PRIVATE -O3 -Wall -Wextra -fPIC)
    set_target_properties(native_solver_core PROPERTIES
        PREFIX "lib"
        SUFFIX ".so"
    )
endif()
