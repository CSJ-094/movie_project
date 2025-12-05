package com.boot.dto;

import com.boot.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserAdminDto {
    private Long id;
    private String email;
    private String role;
    private boolean enabled;

    public static UserAdminDto from(User user) {
        return UserAdminDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .enabled(user.isEnabled())
                .build();
    }
}
