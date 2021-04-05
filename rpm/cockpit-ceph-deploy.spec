%define        __spec_install_post %{nil}
%define          debug_package %{nil}
%define        __os_install_post %{_dbpath}/brp-compress

Name:		cockpit-ceph-deploy
Version:	0.1.0
Release:	1%{?dist}
Summary:	A cockpit module for deploying ceph using Ansible 

Group:		Development/Tools
License:	GPL
URL:		https://github.com/45Drives/cockpit-ceph-deploy
Source0:	%{name}-%{version}.tar.gz

BuildArch:	x86_64
BuildRoot:	%{_tmppath}/%{name}-%{version}-%{release}-root

Requires: cockpit
Requires: cockpit-ws
Requires: cockpit-bridge
Requires: python3

Provides: cockpit-ceph-deploy

%description
A cockpit package for 45Drives Storinator Products.

%prep
%setup -q

%build
# empty

%install
rm -rf %{buildroot}
mkdir -p %{buildroot}

# in builddir
cp -a usr/ %{buildroot}

%clean
rm -rf %{buildroot}

%files
%dir /usr/share/cockpit/ceph-deploy
%defattr(-,root,root,-)
/usr/share/cockpit/ceph-deploy/*

%changelog
* Mon Apr 5 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-1
- Initial Build.
