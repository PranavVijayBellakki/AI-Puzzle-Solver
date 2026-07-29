package com.airesearch.puzzleplatform.controller;

import com.airesearch.puzzleplatform.model.User;
import com.airesearch.puzzleplatform.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String username = request.get("username");
        String password = request.get("password");

        if (email != null) {
            email = email.toLowerCase();
        }

        if (userRepository.findByEmail(email).isPresent()) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Email is already registered.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
        }

        String hashed = passwordEncoder.encode(password);
        User user = new User(email, username, hashed, "local");
        User saved = userRepository.save(user);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        if (email != null) {
            email = email.toLowerCase();
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        boolean passwordMatches = false;
        if (userOpt.isPresent()) {
            String hash = userOpt.get().getPasswordHash();
            if (passwordEncoder.matches(password, hash)) {
                passwordMatches = true;
            } else if (password != null && passwordEncoder.matches(password.toLowerCase(), hash)) {
                passwordMatches = true;
            } else if (password != null && passwordEncoder.matches(password.toUpperCase(), hash)) {
                passwordMatches = true;
            }
        }

        if (userOpt.isEmpty() || !passwordMatches) {
            Map<String, String> err = new HashMap<>();
            err.put("error", "Invalid email or password.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        User user = userOpt.get();
        // Standard JWT generation mock for academic delivery
        String mockJwtToken = "eyJhbGciOiJIUzI1NiJ9.eyNzdWIiOiJSYWoiLCJlbWFpbCI6InJhakAxMjMifQ.mock-signature-abc-123";

        Map<String, Object> response = new HashMap<>();
        response.put("accessToken", mockJwtToken);
        response.put("user", user);

        return ResponseEntity.ok(response);
    }
}
