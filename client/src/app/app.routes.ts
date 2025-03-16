import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent) },
  { path: 'sign-in', loadComponent: () => import('./auth/sign-in/sign-in.component').then(m => m.SignInComponent) },
  { path: 'sign-up', loadComponent: () => import('./auth/sign-up/sign-up.component').then(m => m.SignUpComponent) },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'upload', loadComponent: () => import('./components/upload/upload.component').then(m => m.UploadComponent) },
  { path: 'faq', loadComponent: () => import('./components/faq/faq.component').then(m => m.FaqComponent) },
  { path: 'error/:id', loadComponent: () => import('./components/error/error.component').then(m => m.ErrorComponent) },
  { path: 'profile', loadComponent: ()=> import('./components/profile/profile.component').then(m=>m.ProfileComponent) },
  { path:'mask-text',loadComponent: ()=>import('./components/mask-text/mask-text.component').then(m=>m.MaskTextComponent)},
  { path: 'admin', loadComponent: () => import('./components/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
  { path: 'admin/login', loadComponent: () => import('./components/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent) },
  { path: 'support', loadComponent: () => import('./components/support-ticket/support-ticket.component').then(m => m.SupportTicketComponent) },
  { path: 'guide', loadComponent: () => import('./components/guide/guide.component').then(m => m.GuideComponent) },
  { path:'encrypt-text',loadComponent: ()=>import('./components/encrypt-text/encrypt-text.component').then(m=>m.EncryptTextComponent)},
  { path:'decrypt-text',loadComponent: ()=>import('./components/decrypt-text/decrypt-text.component').then(m=>m.DecryptTextComponent)},
  { path:'analytics',loadComponent: ()=>import('./components/dashboard/analytics/analytics.component').then(m=>m.AnalyticsComponent)}
];
