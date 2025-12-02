package com.boot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.client.ClientConfiguration;
import org.springframework.data.elasticsearch.client.elc.ElasticsearchConfiguration;
import org.springframework.lang.NonNull;

@Configuration
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Override
    @NonNull
    public ClientConfiguration clientConfiguration() {
        return ClientConfiguration.builder()
                .connectedTo("localhost:9200") // 도커 ES 주소
                .build();
    }
}