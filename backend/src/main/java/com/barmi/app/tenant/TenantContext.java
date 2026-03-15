package com.barmi.app.tenant;

public final class TenantContext {
    private static final ThreadLocal<String> STORE_SLUG = new ThreadLocal<>();

    private TenantContext() {}

    public static void setStoreSlug(String slug) { STORE_SLUG.set(slug); }
    public static String getStoreSlug() { return STORE_SLUG.get(); }
    public static void clear() { STORE_SLUG.remove(); }
}
