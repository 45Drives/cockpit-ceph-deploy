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
fi

%files
%dir /usr/share/cockpit/ceph-deploy
%defattr(-,root,root,-)
/usr/share/cockpit/ceph-deploy/*

%changelog
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