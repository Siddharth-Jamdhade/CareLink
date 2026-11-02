import React from "react";
import { NavLink } from "react-router-dom";
import { FiUsers, FiShield } from "react-icons/fi";
export default function MobileNav() {
  return <nav className="mobile-nav" aria-label="Main navigation">
    <NavLink to="/dashboard"><FiUsers /><span>Patients</span></NavLink>
    <span className="nav-brand"><span>+</span>CareLink</span>
    <NavLink to="/settings"><FiShield /><span>Privacy & settings</span></NavLink>
  </nav>;
}
