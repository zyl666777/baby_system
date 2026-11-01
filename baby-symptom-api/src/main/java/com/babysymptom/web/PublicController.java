package com.babysymptom.web;

import com.babysymptom.domain.BodyPart;
import com.babysymptom.repo.BodyPartRepository;
import com.babysymptom.service.SymptomService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

/** 公開 API：3D 前台讀取用，不需要登入，只回傳已發布的內容 */
@RestController
@RequestMapping("/api")
public class PublicController {
    private final SymptomService service;
    private final BodyPartRepository parts;

    public PublicController(SymptomService service, BodyPartRepository parts) {
        this.service = service;
        this.parts = parts;
    }

    @GetMapping("/parts")
    public List<BodyPart> parts() { return parts.findAllByOrderBySortOrderAsc(); }

    @GetMapping("/symptoms")
    public List<PublicSymptom> symptoms() { return service.listPublished(); }
}
