package com.boot.security.oauth2.user;

import java.util.Map;

public class KakaoOAuth2UserInfo implements OAuth2UserInfo {

    private Map<String, Object> attributes;
    private Map<String, Object> attributesAccount;
    private Map<String, Object> attributesProfile;

    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
        this.attributesAccount = (Map<String, Object>) attributes.get("kakao_account");
        if (attributesAccount != null) {
            this.attributesProfile = (Map<String, Object>) attributesAccount.get("profile");
        }
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    @Override
    public String getProviderId() {
        return String.valueOf(attributes.get("id"));
    }

    @Override
    public String getProvider() {
        return "kakao";
    }

    @Override
    public String getEmail() {
        if (attributesAccount == null)
            return null;
        return (String) attributesAccount.get("email");
    }

    @Override
    public String getName() {
        if (attributesProfile == null)
            return null;
        return (String) attributesProfile.get("nickname");
    }
}
