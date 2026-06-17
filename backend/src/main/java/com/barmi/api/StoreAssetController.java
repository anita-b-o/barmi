package com.barmi.api;

import com.barmi.app.store.StoreAssetService;
import com.barmi.app.store.StoreAssetService.StoreAssetUploadResponse;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/store/assets")
public class StoreAssetController {
    private final StoreAssetService storeAssetService;

    public StoreAssetController(StoreAssetService storeAssetService) {
        this.storeAssetService = storeAssetService;
    }

    @PostMapping(path = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoreAssetUploadResponse> uploadLogo(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(storeAssetService.uploadLogo(file));
    }

    @PostMapping(path = "/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoreAssetUploadResponse> uploadBanner(@RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(storeAssetService.uploadBanner(file));
    }
}
