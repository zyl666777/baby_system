package com.babysymptom.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import static org.springframework.security.web.util.matcher.AntPathRequestMatcher.antMatcher;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@SuppressWarnings("deprecation") // AntPathRequestMatcher 在新版標為過時，但仍可正常使用
public class SecurityConfig {
    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    /** H2 主控台：只給管理員，需要放寬 iframe 與 CSRF 設定，所以獨立一組規則 */
    @Bean
    @Order(1)
    SecurityFilterChain h2Console(HttpSecurity http) throws Exception {
        http.securityMatcher(PathRequest.toH2Console())
            .authorizeHttpRequests(a -> a.anyRequest().hasRole("ADMIN"))
            .csrf(c -> c.disable())
            .headers(h -> h.frameOptions(f -> f.sameOrigin()))
            .exceptionHandling(e -> e.authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login")));
        return http.build();
    }

    @Bean
    @Order(2)
    SecurityFilterChain app(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(a -> a
                // 公開：3D 前台讀資料
                .requestMatchers(antMatcher(HttpMethod.GET, "/api/parts"), antMatcher(HttpMethod.GET, "/api/symptoms")).permitAll()
                .requestMatchers(antMatcher("/"), antMatcher("/login"), antMatcher("/error")).permitAll()
                // 管理：一定要登入且是 ADMIN
                .requestMatchers(antMatcher("/admin"), antMatcher("/admin/**"), antMatcher("/api/admin/**")).hasRole("ADMIN")
                // 其他沒列到的一律拒絕（預設拒絕原則）
                .anyRequest().denyAll())
            .formLogin(f -> f.defaultSuccessUrl("/admin/", true))
            .logout(l -> l.logoutSuccessUrl("/login?logout"))
            .cors(Customizer.withDefaults())
            // API 沒登入時回 401，而不是轉址到登入頁
            .exceptionHandling(e -> e.defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    req -> req.getRequestURI().startsWith("/api/")))
            .headers(h -> h
                // CSP：只允許載入自己網站的程式碼，擋掉大部分 XSS
                .contentSecurityPolicy(c -> c.policyDirectives(
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data:; object-src 'none'; base-uri 'self'; " +
                    "form-action 'self'; frame-ancestors 'none'"))
                .referrerPolicy(r -> r.policy(
                    org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    UserDetailsService users(@Value("${app.admin.username}") String username,
                             @Value("${app.admin.password}") String password,
                             PasswordEncoder encoder) {
        if ("change-me".equals(password)) {
            log.warn("⚠️ 管理員還在用預設密碼 change-me，請設定環境變數 ADMIN_PASSWORD");
        }
        return new InMemoryUserDetailsManager(
                User.withUsername(username).password(encoder.encode(password)).roles("ADMIN").build());
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") List<String> origins) {
        CorsConfiguration publicApi = new CorsConfiguration();
        publicApi.setAllowedOrigins(origins);
        publicApi.setAllowedMethods(List.of("GET"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/parts", publicApi);
        source.registerCorsConfiguration("/api/symptoms", publicApi);
        return source;
    }
}
