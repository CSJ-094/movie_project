package com.boot.dto;

import com.boot.entity.User;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

@Data
public class UserSignUpDto {
    private String email;
    private String password;
    private String name;
    private String birthDate;

    public User toEntity(String encodedPassword, String role) {
        return User.builder()
                .email(email)
                .password(encodedPassword)
                .name(name)
                .role(role)
                .birthDate(LocalDate.parse(birthDate))
                .build();
    }
}