import React from 'react';
import {
  AlertCircle, Award, BarChart3, Bell, Briefcase, Building2, Calendar, Camera,
  CheckCircle2, Circle, CircleHelp, Clock, CreditCard, DollarSign, FileText,
  Globe, Heart, HelpCircle, Image, Info, Layers, Layout, Lightbulb, ListChecks,
  Lock, Mail, MapPin, MessageCircle, Mic, Minus, Music, Package, Palette, Phone,
  PieChart, PlayCircle, Plus, Quote, Receipt, Rocket, Send, Settings, Shield,
  Sparkles, Star, Target, ThumbsUp, TrendingDown, TrendingUp, Truck, Unlock,
  User, UserCheck, Users, Video, Wallet, Wrench, XCircle, Youtube, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  AlertCircle, Award, BarChart3, Bell, Briefcase, Building2, Calendar, Camera,
  CheckCircle2, Circle, CircleHelp, Clock, CreditCard, DollarSign, FileText,
  Globe, Heart, HelpCircle, Image, Info, Layers, Layout, Lightbulb, ListChecks,
  Lock, Mail, MapPin, MessageCircle, Mic, Minus, Music, Package, Palette, Phone,
  PieChart, PlayCircle, Plus, Quote, Receipt, Rocket, Send, Settings, Shield,
  Sparkles, Star, Target, ThumbsUp, TrendingDown, TrendingUp, Truck, Unlock,
  User, UserCheck, Users, Video, Wallet, Wrench, XCircle, Youtube, Zap,
};

export interface BuilderIconProps {
  name?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export function BuilderIcon({ name, className = 'w-6 h-6', style }: BuilderIconProps) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : CircleHelp;
  return <Icon className={`shrink-0 ${className}`} style={style} aria-hidden />;
}
