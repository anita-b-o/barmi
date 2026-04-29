import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth, RequireEcosystemMembership, RequireStoreMembership } from '@/core/auth'
import {
  AdminEcosystemOrderDetailScreen,
  AdminEcosystemFulfillmentDetailScreen,
  AdminEcosystemFulfillmentListScreen,
  AdminEcosystemOrdersListScreen,
  AdminEcosystemPromotionsScreen,
  AdminEcosystemProductsScreen,
  AdminEcosystemShippingScreen,
  AdminEcosystemScreen,
  AdminStoreOrderDetailScreen,
  AdminStoreOrdersListScreen,
  AdminStoreProductsScreen,
  AdminStorePromotionsScreen,
  AdminStoreShippingZonesScreen,
  FulfillmentDetailScreen,
  FulfillmentListScreen,
  MembersListScreen,
  AdminHomeScreen,
  AdminStoreScreen
} from '@/pages/admin'
import {
  EcosystemHomeScreen,
  EcosystemCatalogScreen,
  EcosystemStoresMapScreen,
  EcosystemCheckoutScreen,
  EcosystemCheckoutSuccessScreen,
  EcosystemOrderDetailScreen,
  EcosystemOrdersListScreen
} from '@/pages/ecosystem'
import { CheckoutScreen, LoginScreen, OrderDetailScreen, OrdersListScreen, PublicStoreScreen, StoreCheckoutSuccessScreen } from '@/pages/public'
import { routes } from '@/core/constants/routes'

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path={routes.root} element={<Navigate to={routes.publicStore('demo-store')} replace />} />
        <Route path={routes.publicStorePattern} element={<PublicStoreScreen />} />
        <Route path={routes.storeCheckout} element={<CheckoutScreen />} />
        <Route path={routes.storeCheckoutSuccess} element={<StoreCheckoutSuccessScreen />} />
        <Route path={routes.storeOrders} element={<OrdersListScreen />} />
        <Route path={routes.storeOrderDetail} element={<OrderDetailScreen />} />

        <Route path={routes.ecosystemHome} element={<EcosystemHomeScreen />} />
        <Route path={routes.ecosystemStoresMap} element={<EcosystemStoresMapScreen />} />
        <Route path={routes.ecosystemCatalog} element={<EcosystemCatalogScreen />} />
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
    </BrowserRouter>
  )
}
