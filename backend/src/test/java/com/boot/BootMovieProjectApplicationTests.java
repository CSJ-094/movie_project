package com.boot;

import com.boot.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@Import(TestSecurityConfig.class)
class BootMovieProjectApplicationTests {

	@Test
	void contextLoads() {
	}

}
