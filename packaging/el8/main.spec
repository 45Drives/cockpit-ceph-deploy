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
    if [ -d "$(STATE_DIR)" ];then
   	    echo "Copying state files to temporary directory."
        mkdir -p $(TEMP_DIR)
	    cp -r $(STATE_DIR) $(TEMP_DIR)
    fi

    echo "Checking for existing parameter files."
    if [ -d "$(PARAM_DIR)" ]; then
	    mkdir -p $(TEMP_DIR)
	    cp -r $(PARAM_DIR) $(TEMP_DIR)
        echo "Copying parameter files to temporary directory."
    fi
    echo "----------------------------------"
fi

%install
make DESTDIR=%{buildroot} install

%post
NEW_STATE_DIR=%{buildroot}/usr/share/cockpit/ceph-deploy/state
NEW_PARAM_DIR=%{buildroot}/usr/share/cockpit/ceph-deploy/params
TEMP_DIR=/opt/ceph-deploy-tmp
TEMP_STATE_DIR=/opt/ceph-deploy-tmp/state
TEMP_PARAM_DIR=/opt/ceph-deploy-tmp/params

if [ $1 == 1 ] || [ $1 == 2 ];then
    echo "----------------------------------"
    echo "Checking for existing state files."
    if [ -d "$(TEMP_STATE_DIR)" ];then
   	    echo "Copying state files from temporary directory."
        mkdir -p $(NEW_STATE_DIR)
	    cp -r $(TEMP_STATE_DIR) $(STATE_DIR)
    fi

    echo "Checking for existing parameter files."
    if [ -d "$(TEMP_PARAM_DIR)" ]; then
	    mkdir -p $(NEW_PARAM_DIR)
	    cp -r $(TEMP_PARAM_DIR) $(NEW_STATE_DIR)
        echo "Copying parameter files from temporary directory."
    fi

    if [ -d "$(TEMP_DIR)" ]; then
        echo "Removing temporary directory"
	    rm -rf $(TEMP_DIR)
    fi
    echo "----------------------------------"
fi

%files
%dir /usr/share/cockpit/ceph-deploy
%defattr(-,root,root,-)
/usr/share/cockpit/ceph-deploy/*

%changelog
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-10
- checking to ensure that state files are updating
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-9
- testing upgrade path
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-8
- makefile was going makefile things
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-7
- updated deb scripts
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-6
- 6th build
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-5
- 5th build
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-4
- fourth build
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-3
- third build
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-2
- second build
- second build
* Thu Jul 15 2021 Mark Hooper <mhooper@45drives.com> 0.1.0-1
- first build