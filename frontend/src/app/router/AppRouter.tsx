import { Suspense, lazy, useEffect } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { appConfig } from '@/app/config/env'
import { RequireAuth, RequireEcosystemMembership, RequireStoreMembership } from '@/core/auth'
import LoadingState from '@/components/feedback/LoadingState'
import ObservabilitySmokeScreen from '@/app/observability/ObservabilitySmokeScreen'
import { routes } from '@/core/constants/routes'

type LazyFactory<T extends { default: ComponentType<any> }> = () => Promise<T>
type PreloadableComponent = LazyExoticComponent<ComponentType<any>> & { preload: () => Promise<unknown> }

function lazyWithPreload<T extends { default: ComponentType<any> }>(factory: LazyFactory<T>): PreloadableComponent {
  const Component = lazy(factory) as PreloadableComponent
  Component.preload = factory
  return Component
}

const PublicStoreScreen = lazyWithPreload(() => import('@/pages/public/PublicStoreScreen'))
const PublicStoreProductDetailScreen = lazyWithPreload(() => import('@/pages/public/PublicStoreProductDetailScreen'))
const CheckoutScreen = lazyWithPreload(() => import('@/pages/public/CheckoutScreen'))
const StoreCheckoutSuccessScreen = lazyWithPreload(() => import('@/pages/public/StoreCheckoutSuccessScreen'))
const OrdersListScreen = lazyWithPreload(() => import('@/pages/public/OrdersListScreen'))
const OrderDetailScreen = lazyWithPreload(() => import('@/pages/public/OrderDetailScreen'))
const LoginScreen = lazyWithPreload(() => import('@/pages/public/LoginScreen'))

const EcosystemHomeScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemHomeScreen'))
const EcosystemCatalogScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemCatalogScreen'))
const EcosystemCategoryScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemCategoryScreen'))
const EcosystemStoresMapScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemStoresMapScreen'))
const EcosystemCheckoutScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemCheckoutScreen'))
const EcosystemCheckoutSuccessScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemCheckoutSuccessScreen'))
const EcosystemOrdersListScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemOrdersListScreen'))
const EcosystemOrderDetailScreen = lazyWithPreload(() => import('@/pages/ecosystem/EcosystemOrderDetailScreen'))

const AdminHomeScreen = lazyWithPreload(() => import('@/pages/admin/AdminHomeScreen'))
const AdminSaasScreen = lazyWithPreload(() => import('@/pages/admin/AdminSaasScreen'))
const AdminStoreOrdersListScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreOrdersListScreen'))
const FulfillmentListScreen = lazyWithPreload(() => import('@/pages/admin/FulfillmentListScreen'))
const FulfillmentDetailScreen = lazyWithPreload(() => import('@/pages/admin/FulfillmentDetailScreen'))
const MembersListScreen = lazyWithPreload(() => import('@/pages/admin/MembersListScreen'))
const AdminStoreOrderDetailScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreOrderDetailScreen'))
const AdminStoreScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreScreen'))
const AdminStoreProductAnalyticsScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreProductAnalyticsScreen'))
const AdminStoreCommerceAnalyticsScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreCommerceAnalyticsScreen'))
const AdminStoreFunnelAnalyticsScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreFunnelAnalyticsScreen'))
const AdminStoreProductsScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreProductsScreen'))
const AdminStoreModulesScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreModulesScreen'))
const AdminStoreOnboardingScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreOnboardingScreen'))
const AdminStorePromotionsScreen = lazyWithPreload(() => import('@/pages/admin/AdminStorePromotionsScreen'))
const AdminStoreShippingZonesScreen = lazyWithPreload(() => import('@/pages/admin/AdminStoreShippingZonesScreen'))
const AdminEcosystemScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemScreen'))
const AdminEcosystemOrdersListScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemOrdersListScreen'))
const AdminEcosystemOrderDetailScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemOrderDetailScreen'))
const AdminEcosystemFulfillmentListScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemFulfillmentListScreen'))
const AdminEcosystemFulfillmentDetailScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemFulfillmentDetailScreen'))
const AdminEcosystemProductsScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemProductsScreen'))
const AdminEcosystemShippingScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemShippingScreen'))
const AdminEcosystemPromotionsScreen = lazyWithPreload(() => import('@/pages/admin/AdminEcosystemPromotionsScreen'))

function collectRoutePreloaders(pathname: string) {
  if (pathname === routes.root) return [PublicStoreScreen]
  if (pathname.startsWith('/public/')) {
    if (/^\/public\/[^/]+\/products\/[^/]+/.test(pathname)) return [PublicStoreProductDetailScreen]
    if (pathname === routes.storeCheckout) return [CheckoutScreen]
    if (pathname === routes.storeCheckoutSuccess) return [StoreCheckoutSuccessScreen]
    if (pathname === routes.storeOrders) return [OrdersListScreen]
    return [PublicStoreScreen]
  }
  if (pathname === routes.storeCheckout) return [CheckoutScreen]
  if (pathname === routes.storeCheckoutSuccess) return [StoreCheckoutSuccessScreen]
  if (pathname === routes.storeOrders) return [OrdersListScreen]
  if (pathname.startsWith('/store/orders/')) return [OrderDetailScreen]

  if (pathname === routes.ecosystemHome) return [EcosystemHomeScreen]
  if (pathname === routes.ecosystemCatalog) return [EcosystemCatalogScreen]
  if (pathname.startsWith('/ecosystem/categories/')) return [EcosystemCategoryScreen]
  if (pathname === routes.ecosystemStoresMap) return [EcosystemStoresMapScreen]
  if (pathname === routes.ecosystemCheckout) return [EcosystemCheckoutScreen]
  if (pathname === routes.ecosystemCheckoutSuccess) return [EcosystemCheckoutSuccessScreen]
  if (pathname === routes.ecosystemOrders) return [EcosystemOrdersListScreen]
  if (pathname.startsWith('/ecosystem/orders/')) return [EcosystemOrderDetailScreen]

  if (pathname === routes.login) return [LoginScreen]
  if (pathname === routes.adminHome) return [AdminHomeScreen]
  if (pathname === routes.adminSaas) return [AdminSaasScreen]
  if (pathname === routes.adminOrders) return [AdminStoreOrdersListScreen]
  if (pathname.startsWith('/admin/orders/')) return [AdminStoreOrderDetailScreen]
  if (pathname === routes.adminFulfillments) return [FulfillmentListScreen]
  if (pathname.startsWith('/admin/fulfillments/')) return [FulfillmentDetailScreen]
  if (pathname === routes.adminMembers) return [MembersListScreen]
  if (pathname === routes.adminStore) return [AdminStoreScreen]
  if (pathname === routes.adminStoreFunnelAnalytics) return [AdminStoreFunnelAnalyticsScreen]
  if (pathname === routes.adminStoreCommerceAnalytics) return [AdminStoreCommerceAnalyticsScreen]
  if (pathname === routes.adminStoreAnalytics) return [AdminStoreProductAnalyticsScreen]
  if (pathname === routes.adminStoreProducts) return [AdminStoreProductsScreen]
  if (pathname === routes.adminStoreModules) return [AdminStoreModulesScreen]
  if (pathname === routes.adminStoreOnboarding) return [AdminStoreOnboardingScreen]
  if (pathname === routes.adminStorePromotions) return [AdminStorePromotionsScreen]
  if (pathname === routes.adminShippingZones) return [AdminStoreShippingZonesScreen]
  if (pathname === routes.adminEcosystem) return [AdminEcosystemScreen]
  if (pathname === routes.adminEcosystemOrders) return [AdminEcosystemOrdersListScreen]
  if (pathname.startsWith('/admin/ecosystem/orders/')) return [AdminEcosystemOrderDetailScreen]
  if (pathname === routes.adminEcosystemFulfillments) return [AdminEcosystemFulfillmentListScreen]
  if (pathname.startsWith('/admin/ecosystem/fulfillments/')) return [AdminEcosystemFulfillmentDetailScreen]
  if (pathname === routes.adminEcosystemProducts) return [AdminEcosystemProductsScreen]
  if (pathname === routes.adminEcosystemShipping) return [AdminEcosystemShippingScreen]
  if (pathname === routes.adminEcosystemPromotions) return [AdminEcosystemPromotionsScreen]

  return [PublicStoreScreen]
}

export function preloadRouteForPath(pathname: string) {
  return Promise.all(collectRoutePreloaders(pathname).map((component) => component.preload()))
}

function AppRouteLoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 'min(100%, 420px)' }}>
        <LoadingState label="Cargando pantalla..." />
      </div>
    </div>
  )
}

function ScrollManager() {
  const location = useLocation()

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1))
      if (target) {
        target.scrollIntoView({ block: 'start' })
        return
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.hash, location.pathname, location.search])

  return null
}

function RoutedScreens() {
  return (
    <>
      <ScrollManager />
      <Suspense fallback={<AppRouteLoadingFallback />}>
        <Routes>
          <Route path={routes.root} element={<Navigate to={routes.publicStore('demo-store')} replace />} />
          {appConfig.observabilitySmokeEnabled ? (
            <Route path={routes.observabilitySmoke} element={<ObservabilitySmokeScreen />} />
          ) : null}
          <Route path={routes.publicStorePattern} element={<PublicStoreScreen />} />
          <Route path={routes.publicStoreProductPattern} element={<PublicStoreProductDetailScreen />} />
          <Route path={routes.storeCheckout} element={<CheckoutScreen />} />
          <Route path={routes.storeCheckoutSuccess} element={<StoreCheckoutSuccessScreen />} />
          <Route path={routes.storeOrders} element={<OrdersListScreen />} />
          <Route path={routes.storeOrderDetail} element={<OrderDetailScreen />} />

          <Route path={routes.ecosystemHome} element={<EcosystemHomeScreen />} />
          <Route path={routes.ecosystemStoresMap} element={<EcosystemStoresMapScreen />} />
          <Route path={routes.ecosystemCatalog} element={<EcosystemCatalogScreen />} />
          <Route path={routes.ecosystemCategoryPattern} element={<EcosystemCategoryScreen />} />
          <Route path={routes.ecosystemCheckout} element={<EcosystemCheckoutScreen />} />
          <Route path={routes.ecosystemCheckoutSuccess} element={<EcosystemCheckoutSuccessScreen />} />
          <Route path={routes.ecosystemOrders} element={<EcosystemOrdersListScreen />} />
          <Route path={routes.ecosystemOrderDetail} element={<EcosystemOrderDetailScreen />} />

          <Route path={routes.login} element={<LoginScreen />} />
          <Route
            path={routes.adminHome}
            element={
              <RequireAuth>
                <AdminHomeScreen />
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminSaas}
            element={
              <RequireAuth>
                <AdminSaasScreen />
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminOrders}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreOrdersListScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminFulfillments}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <FulfillmentListScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminFulfillmentDetailPattern}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <FulfillmentDetailScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminMembers}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <MembersListScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminOrderDetailPattern}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreOrderDetailScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStore}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreAnalytics}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreProductAnalyticsScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreCommerceAnalytics}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreCommerceAnalyticsScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreFunnelAnalytics}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreFunnelAnalyticsScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreProducts}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreProductsScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreModules}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreModulesScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStoreOnboarding}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreOnboardingScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminStorePromotions}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStorePromotionsScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminShippingZones}
            element={
              <RequireAuth>
                <RequireStoreMembership>
                  <AdminStoreShippingZonesScreen />
                </RequireStoreMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystem}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemOrders}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemOrdersListScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemOrderDetailPattern}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemOrderDetailScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemFulfillments}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemFulfillmentListScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemFulfillmentDetailPattern}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemFulfillmentDetailScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemProducts}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemProductsScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemShipping}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemShippingScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />
          <Route
            path={routes.adminEcosystemPromotions}
            element={
              <RequireAuth>
                <RequireEcosystemMembership>
                  <AdminEcosystemPromotionsScreen />
                </RequireEcosystemMembership>
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to={routes.publicStore('demo-store')} replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RoutedScreens />
    </BrowserRouter>
  )
}
