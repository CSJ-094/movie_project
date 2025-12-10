package com.boot;

import com.boot.config.TmdbProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

//
@SpringBootApplication
@EnableConfigurationProperties(TmdbProperties.class)
public class
BootMovieProjectApplication {

	public static void main(String[] args) {
		SpringApplication.run(BootMovieProjectApplication.class, args);
	}

}
//