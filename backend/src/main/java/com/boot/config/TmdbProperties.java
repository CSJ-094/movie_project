package com.boot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "tmdb")
public class TmdbProperties {
    private String apiKey;
    private String baseUrl;
}
