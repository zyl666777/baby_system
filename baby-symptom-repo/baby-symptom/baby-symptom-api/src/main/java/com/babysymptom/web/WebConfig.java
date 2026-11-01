package com.babysymptom.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry r) {
        r.addRedirectViewController("/", "/admin/");
        r.addRedirectViewController("/admin", "/admin/");
        r.addViewController("/admin/").setViewName("forward:/admin/index.html");
    }
}
