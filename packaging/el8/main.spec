Name: ::package_name::
Version: ::package_version::
Release: ::package_build_version::%{?dist}
Summary: ::package_description_short::
License: ::package_licence::
URL: ::package_url::
Source0: %{name}-%{version}.tar.gz
BuildArch: ::package_architecture_el::
Requires: ::package_dependencies_el::

BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root

%description
::package_title::
::package_description_long::

%prep
%setup -q

%build


%pre
STATE_DIR=/usr/share/cockpit/ceph-deploy/state
PARAM_DIR=/usr/share/cockpit/ceph-deploy/params
TEMP_DIR=/opt/ceph-deploy-tmp

if [ $1 == 1 ] || [ $1 == 2 ];then
    echo "----------------------------------"
    echo "Checking for existing state files."
    if [ -d "$STATE_DIR" ];then
   	    echo "Copying state files to temporary directory."
        mkdir -p "$TEMP_DIR"
	    cp -r "$STATE_DIR" "$TEMP_DIR"
    fi

    echo "Checking for existing parameter files."
    if [ -d "$PARAM_DIR" ]; then
	    mkdir -p "$TEMP_DIR"
	    cp -r "$PARAM_DIR" "$TEMP_DIR"
        echo "Copying parameter files to temporary directory."
    fi
    echo "----------------------------------"
fi

%install
make DESTDIR=%{buildroot} install

%post
NEW_STATE_DIR=/usr/share/cockpit/ceph-deploy
NEW_PARAM_DIR=/usr/share/cockpit/ceph-deploy
TEMP_DIR=/opt/ceph-deploy-tmp
TEMP_STATE_DIR=/opt/ceph-deploy-tmp/state
TEMP_PARAM_DIR=/opt/ceph-deploy-tmp/params

if [ $1 == 1 ] || [ $1 == 2 ];then
    echo "----------------------------------"
    echo "Checking for existing state files."
    if [ -d "$TEMP_STATE_DIR" ];then
   	    echo "Copying state files from temporary directory."
        mkdir -p "$NEW_STATE_DIR"
	    cp -r "$TEMP_STATE_DIR" "$NEW_STATE_DIR"
    fi

    echo "Checking for existing parameter files."
    if [ -d "$TEMP_PARAM_DIR" ]; then
	    mkdir -p "$NEW_PARAM_DIR"
	    cp -r "$TEMP_PARAM_DIR" "$NEW_STATE_DIR"
        echo "Copying parameter files from temporary directory."
    fi

    if [ -d "$TEMP_DIR" ]; then
        echo "Removing temporary directory"
	    rm -rf "$TEMP_DIR"
    fi
    echo "----------------------------------"
fi

%postun
if [ $1 == 0 ];then
    rm -rf /usr/share/cockpit/ceph-deploy
    rm -f /usr/bin/ansible_runner
fi

%files
%dir /usr/share/cockpit/ceph-deploy
%defattr(-,root,root,-)
%{_bindir}/*
/usr/share/cockpit/ceph-deploy/*

%changelog
* Wed Jul 06 2022 Mark Hooper <mhooper@45drives.com> 1.0.4-1
- updated samba configuration options to work with samba-ansible package
- updated dependencies to include samba-ansible and ceph-ansible-45d >= 5.3.1
- added new field for floating ip interface when configuring nfs
* Tue Jul 05 2022 Mark Hooper <mhooper@45drives.com> 1.0.3-5
- added option for nfss to set the interface used for floating ip. ceph_nfs_floating_ip_interface
* Fri Jun 24 2022 Mark Hooper <mhooper@45drives.com> 1.0.3-4
- updated query selector for multi-device-path options
* Fri Jun 10 2022 Mark Hooper <mhooper@45drives.com> 1.0.3-3
- added a prerun option when deploying smb with kerberos in ansible_runner
* Thu Jun 02 2022 Mark Hooper <mhooper@45drives.com> 1.0.3-2
- added -f flag to postun script (el8 and ubuntu)
* Wed Jun 01 2022 Mark Hooper <mhooper@45drives.com> 1.0.3-1
- Added required options for deploying samba using new features from samba-ansible
- Added a verbose option to ansible_runner
- updated helper scripts for handling new samba parameters
* Thu Apr 28 2022 Mark Hooper <mhooper@45drives.com> 1.0.2-2
- virtual ip interfaces for rgwloadbalancers can now be set on the host level
* Mon Dec 13 2021 Mark Hooper <mhooper@45drives.com> 1.0.2-1
- updated the ceph-ansible-45d dependency to require minimum version 5.2.6
- added options to use dedicated device journaling for osd nodes
- added options required to use offline repos
* Fri Nov 26 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-9
- added block_db_size in osd configuration options
- moved the offline_install checkbox to a role-independent section of page
* Thu Nov 25 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-8
- fixed bug that missed single variable entries in smbs.yml during inventory file
  generation
* Tue Nov 09 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-7
- updated the check_name_field to allow names that contain period characters.
* Thu Oct 21 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-6
- added an offline_install option in ansible configuration step for use with 45Drives
  offline repos
* Wed Oct 13 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-5
- added option to show default parameters to core_params script
- fixed bug that sent empty group options resulting in unecessary error messages
  when updating options in ansible configuration step
* Wed Oct 06 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-4
- fixed bug that caused warning messages to persist after a purge playbook was run
- modified how main menu locks are handled
- made ansible_runner help menu easier to read when using cli
- removed unnecessary console.log statements from terminal.js and ceph-deploy.js
* Tue Sep 07 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-3
- fixed inventory file generation bug that caused repeated active directory information
  to be placed in smbs.yml
* Tue Aug 31 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-2
- modified dashboard step unlock requirements to include ceph core
* Thu Aug 26 2021 Mark Hooper <mhooper@45drives.com> 1.0.1-1
- first stable release of cockpit-ceph-deploy
- added Ctrl+C interrupt to ansible_runner
- deploy steps remain locked if required roles are not assigned
- added 45Drives branding to main menu
- modified the pre-configuration step instructions
* Thu Aug 26 2021 Mark Hooper <mhooper@45drives.com> 1.0.0-2
- first stable release of cockpit-ceph-deploy
- added Ctrl+C interrupt to ansible_runner
- added 45Drives branding to main menu
- deploy steps remain locked if required roles are not assigned
- modified the pre-configuration step instructions
* Tue Aug 24 2021 Mark Hooper <mhooper@45drives.com> 1.0.0-1
- added Ctrl+C interrupt to ansible_runner
- deploy steps remain locked if required roles are not assigned
- added 45Drives branding to main menu
- modified the pre-configuration step instructions
- updated README.md
* Tue Aug 24 2021 Mark Hooper <mhooper@45drives.com> 0.3.0-1
- test build before stable release
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-9
- changed makefile
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-8
- changed makefile
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-7
- changed makefile
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-6
- changed makefile
- changed makefile
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-5
- added symlink to /usr/bin for rocky in makefile
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-4
- added python3-dataclasses dependency for el8
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-3
- added python3-dataclasses dependency for el8
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-2
- added primitive warning messages when parameters used to deploy are modified
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.2.0-1
- added primitive warning messages when parameters used to deploy are modified
* Wed Jul 28 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-20
- added handling for modifying assigned roles used in deployment step
- roles are now sorted alphabetically by core_params
- added purge_rgw command to ansible_runner
- added primitive warning messages when parameters used to deploy are modified
* Mon Jul 26 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-19
- adding warnadded warning indicators if parameters are changeimportant parameters
  are changed
* Mon Jul 26 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-18
- adding warnadded warning indicators if parameters are changeimportant parameters
  are changed
* Fri Jul 23 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-17
- added warning indicators if important parameters are changed
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-16
- fixed text replacement in make_hosts script
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-15
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-14
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-13
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-12
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-11
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-10
- state handling
* Thu Jul 22 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-9
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-8
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-7
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-6
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-5
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-4
- state handling
* Wed Jul 21 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-3
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-2
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.5-1
- added purge playbooks to ansible_runner
- added the ability to force re-generation of inventory files
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-29
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-28
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-27
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-26
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-25
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-24
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-23
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-22
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-21
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-20
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-19
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-18
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-17
- state handling
* Tue Jul 20 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-16
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-15
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-14
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-13
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-12
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-11
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-10
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-9
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-8
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-7
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-6
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-5
- changed ansible_runner entry for remove_vg command
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-4
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-3
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-2
- state handling
* Mon Jul 19 2021 Mark Hooper <mhooper@45drives.com> 0.1.4-1
- state handling
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.3-3
- added check in ansible_runner script for key
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.3-2
- modified how completed steps can be set back to incomplete
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.3-1
- updated ansible_runner to remove deploy state entries for purge plays
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-8
- added postun section to .spec file
- incremented build number
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-7
- changed .spec file
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-6
- third rpm test
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-5
- second rpmbuild test
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-4
- first rpm build test
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-3
- modified spec file
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-2
- changed postinst state and param path
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.2-1
- changed postinst script
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.1-3
- changed postinst script
* Fri Jul 16 2021 Mark Hooper <mhooper@45drives.com> 0.1.1-2
- updated css
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.1-1
- modified debian install scripts