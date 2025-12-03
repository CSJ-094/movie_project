package com.boot.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetDto {
    private String email;
    private String newPassword;
}