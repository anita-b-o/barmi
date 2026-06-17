package com.barmi.app.store;

import com.barmi.app.security.StoreAuthorizationService;
import com.barmi.domain.store.Store;
import com.barmi.infra.repo.StoreRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;

@Service
public class StoreAssetService {
    private static final long LOGO_MAX_BYTES = 5L * 1024L * 1024L;
    private static final long BANNER_MAX_BYTES = 10L * 1024L * 1024L;
    private static final Map<String, String> EXTENSIONS_BY_CONTENT_TYPE = Map.of(
            "image/png", "png",
            "image/jpeg", "jpg",
            "image/webp", "webp"
    );

    private final StoreAuthorizationService storeAuthorizationService;
    private final StoreRepository storeRepository;
    private final Path uploadsRoot;

    public StoreAssetService(
            StoreAuthorizationService storeAuthorizationService,
            StoreRepository storeRepository,
            @Value("${app.uploads.root:uploads}") String uploadsRoot
    ) {
        this.storeAuthorizationService = storeAuthorizationService;
        this.storeRepository = storeRepository;
        this.uploadsRoot = Path.of(uploadsRoot).normalize();
    }

    @Transactional
    public StoreAssetUploadResponse uploadLogo(MultipartFile file) {
        Store store = requireStoreForAssetUpload();
        String url = saveAsset(store, file, "logo", LOGO_MAX_BYTES);
        store.updateBranding(url, store.getBannerUrl(), store.getPrimaryColor(), store.getSecondaryColor());
        storeRepository.save(store);
        return new StoreAssetUploadResponse(url);
    }

    @Transactional
    public StoreAssetUploadResponse uploadBanner(MultipartFile file) {
        Store store = requireStoreForAssetUpload();
        String url = saveAsset(store, file, "banner", BANNER_MAX_BYTES);
        store.updateBranding(store.getLogoUrl(), url, store.getPrimaryColor(), store.getSecondaryColor());
        storeRepository.save(store);
        return new StoreAssetUploadResponse(url);
    }

    private Store requireStoreForAssetUpload() {
        storeAuthorizationService.requireAdmin();
        return storeAuthorizationService.requireCurrentStore();
    }

    private String saveAsset(Store store, MultipartFile file, String assetName, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "asset_file_required");
        }
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, assetName + "_too_large");
        }

        String extension = EXTENSIONS_BY_CONTENT_TYPE.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported_image_type");
        }

        Path storeDir = uploadsRoot.resolve("stores").resolve(store.getId().toString()).normalize();
        if (!storeDir.startsWith(uploadsRoot.toAbsolutePath().normalize()) && uploadsRoot.isAbsolute()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "invalid_upload_path");
        }

        try {
            Files.createDirectories(storeDir);
            deletePreviousAssetFiles(storeDir, assetName);
            Path target = storeDir.resolve(assetName + "." + extension);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/stores/" + store.getId() + "/" + assetName + "." + extension;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "asset_upload_failed", ex);
        }
    }

    private void deletePreviousAssetFiles(Path storeDir, String assetName) throws IOException {
        for (String extension : EXTENSIONS_BY_CONTENT_TYPE.values()) {
            Files.deleteIfExists(storeDir.resolve(assetName + "." + extension));
        }
    }

    public record StoreAssetUploadResponse(String url) {}
}
