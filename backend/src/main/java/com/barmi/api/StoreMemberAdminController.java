package com.barmi.api;

import com.barmi.app.store.StoreMemberAdminService;
import com.barmi.app.store.StoreMemberAdminService.StoreMemberAdminDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/store/members")
public class StoreMemberAdminController {

    private final StoreMemberAdminService storeMemberAdminService;

    public StoreMemberAdminController(StoreMemberAdminService storeMemberAdminService) {
        this.storeMemberAdminService = storeMemberAdminService;
    }

    public record CreateMemberReq(String memberEmail, String role) {}

    public record UpdateRoleReq(String role) {}

    public record UpdateStatusReq(String status) {}

    @GetMapping
    public ResponseEntity<List<StoreMemberAdminDto>> list() {
        return ResponseEntity.ok(storeMemberAdminService.listMembers());
    }

    @PostMapping
    public ResponseEntity<StoreMemberAdminDto> create(@RequestBody CreateMemberReq req) {
        StoreMemberAdminDto dto = storeMemberAdminService.createMember(req.memberEmail(), req.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PatchMapping("/{memberId}/role")
    public ResponseEntity<StoreMemberAdminDto> updateRole(
            @PathVariable UUID memberId,
            @RequestBody UpdateRoleReq req
    ) {
        return ResponseEntity.ok(storeMemberAdminService.updateRole(memberId, req.role()));
    }

    @PatchMapping("/{memberId}/status")
    public ResponseEntity<StoreMemberAdminDto> updateStatus(
            @PathVariable UUID memberId,
            @RequestBody UpdateStatusReq req
    ) {
        return ResponseEntity.ok(storeMemberAdminService.updateStatus(memberId, req.status()));
    }
}
