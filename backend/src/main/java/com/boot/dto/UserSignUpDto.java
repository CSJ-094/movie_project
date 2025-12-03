package com.boot.dto;

import com.boot.entity.User;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserSignUpDto {
    private String email;
    private String password;
    private String name;

    public User toEntity(String encodedPassword, String role) {
        return User.builder()
                .email(email)
                .password(encodedPassword)
                .name(name)
                .role(role)
                .build();
    }
}