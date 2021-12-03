/*
    Cockpit Ceph Deploy - A cockpit module for configuring ceph using 45drives Ansible Playbooks.
    Copyright (C) 2021 Mark Hooper <mhooper@45drives.com>
    
    This file is part of Cockpit Ceph Deploy.
    Cockpit Ceph Deploy is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    Cockpit Ceph Deploy is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with Cockpit Ceph Deploy.  If not, see <https://www.gnu.org/licenses/>.
*/
let g_core_params = null;
let g_deploy_file = null;
let g_inv_default_requirements = {
  "all.yml": {
    content: null,
    completed: false,
  },
  hosts: {
    content: null,
    completed: false,
  },
};

let g_deploy_step_id_lut = {
  "deploy-step-preconfig": {
    step_name: "Pre-Configuration",
    inventory_files: [],
    purge_playbooks: [],
    roles: [],
  },
  "deploy-step-ansible-config": {
    step_name: "Ansible Configuration",
    inventory_files: [],
    purge_playbooks: [],
    roles: [],
  },
  "deploy-step-core": {
    step_name: "Ceph Core",
    inventory_files: ["hosts", "all.yml"],
    purge_playbooks: ["remove_core"],
    roles: ["osds", "mons", "mgrs"],
  },
  "deploy-step-cephfs": {
    step_name: "CephFS",
    inventory_files: ["hosts", "all.yml"],
    purge_playbooks: ["remove_core"],
    roles: ["mdss"],
  },
  "deploy-step-nfs": {
    step_name: "NFS",
    inventory_files: ["hosts", "nfss.yml"],
    purge_playbooks: ["remove_nfss", "remove_core"],
    roles: ["nfss"],
  },
  "deploy-step-smb": {
    step_name: "SMB",
    inventory_files: ["hosts", "smbs.yml"],
    purge_playbooks: ["remove_smbs", "remove_core"],
    roles: ["smbs"],
  },
  "deploy-step-rgw": {
    inventory_files: ["hosts", "all.yml"],
    purge_playbooks: ["remove_rgw", "remove_core"],
    roles: ["rgws"],
  },
  "deploy-step-rgwlb": {
    step_name: "Load Balancing",
    inventory_files: ["hosts", "rgwloadbalancers.yml"],
    purge_playbooks: ["remove_rgw", "remove_core"],
    roles: ["rgwloadbalancers"],
  },
  "deploy-step-iscsi": {
    step_name: "ISCSI Service",
    inventory_files: ["hosts"],
    purge_playbooks: ["remove_iscsi", "remove_core"],
    roles: ["iscsigws"],
  },
  "deploy-step-dashboard": {
    step_name: "Dashboard",
    inventory_files: ["hosts"],
    purge_playbooks: ["remove_core"],
    roles: ["metrics"],
  },
};

let g_role_to_deploy_step_lut = {
  mons: ["deploy-step-core", "deploy-step-cephfs"],
  mgrs: ["deploy-step-core", "deploy-step-cephfs"],
  osds: ["deploy-step-core", "deploy-step-cephfs"],
  metrics: ["deploy-step-dashboard"],
  mdss: ["deploy-step-cephfs"],
  smbs: ["deploy-step-smb"],
  nfss: ["deploy-step-nfs"],
  iscsigws: ["deploy-step-iscsi"],
  rgws: ["deploy-step-rgw"],
  rgwloadbalancers: ["deploy-step-rgwlb"],
  client: ["deploy-step-dashboard"],
};

let g_inventory_file_vars = {
  hosts: {
    file_content_div_id: "host-file-content",
    show_button_id: "show-host-file-btn",
    generate_button_id: "generate-host-file-btn",
    default_content_div: "inv-file-hosts-default",
    next_button_id: "ansible-config-inv-nxt",
    show_listener: show_host_file,
  },
  "all.yml": {
    file_content_div_id: "all-file-content",
    show_button_id: "show-all-file-btn",
    generate_button_id: "generate-all-file-btn",
    default_content_div: "inv-file-all-default",
    next_button_id: "ansible-config-inv-nxt",
    show_listener: show_all_file,
  },
  "rgwloadbalancers.yml": {
    file_content_div_id: "rgwlb-file-content",
    show_button_id: "show-rgwlb-file-btn",
    generate_button_id: "generate-rgwlb-file-btn",
    default_content_div: "inv-file-rgwlb-default",
    next_button_id: "ansible-config-inv-nxt",
    show_listener: show_rgwlb_file,
  },
  "nfss.yml": {
    file_content_div_id: "nfss-file-content",
    show_button_id: "show-nfss-file-btn",
    generate_button_id: "generate-nfss-file-btn",
    default_content_div: "inv-file-nfss-default",
    next_button_id: "ansible-config-inv-nxt",
    show_listener: show_nfss_file,
  },
  "smbs.yml": {
    file_content_div_id: "smbs-file-content",
    show_button_id: "show-smbs-file-btn",
    generate_button_id: "generate-smbs-file-btn",
    default_content_div: "inv-file-smbs-default",
    next_button_id: "ansible-config-inv-nxt",
    show_listener: show_smbs_file,
  },
};

let g_all_option_scheme = {
  all: {
    inventory_file: false,
    global: [
      {
        option_name: "offline_install",
        option_format: "global-toggle",
        toggle_options: [
          {
            option_name: "offline_repo_server_ip",
            option_format: "default",
            optional: false,
            label: "offline_repo_server_ip",
            feedback: true,
            feedback_type: "ip",
            help: "",
            input_type: "text",
            default_value: "",
          },
        ],
        optional: true,
        label: "Offline Install",
        feedback: false,
        help: "",
        input_type: "checkbox",
        default_value: false,
      },
    ],
    unique: [],
    group: [],
  },
};

let g_option_scheme = {
  mons: {
    inventory_file: false,
    global: [
      {
        option_name: "monitor_interface",
        option_format: "default",
        optional: false,
        label: "monitor_interface",
        feedback: true,
        feedback_type: "name",
        help: "",
        input_type: "text",
        default_value: "",
      },
      {
        option_name: "ip_version",
        option_format: "default",
        optional: false,
        label: "ip_version",
        feedback: true,
        feedback_type: "choice",
        feedback_choice_options: ["ipv4", "ipv6"],
        help: "",
        input_type: "text",
        default_value: "ipv4",
      },
    ],
    unique: [
      {
        option_name: "monitor_interface",
        option_format: "default",
        optional: true,
        label: "monitor_interface",
        feedback: true,
        feedback_type: "name",
        help: "",
        input_type: "text",
        default_value: "",
      },
    ],
    group: [],
  },
  mgrs: {
    inventory_file: false,
    global: [],
    unique: [],
    group: [],
  },
  osds: {
    inventory_file: false,
    global: [
      {
        option_name: "public_network",
        option_format: "default",
        optional: false,
        label: "public_network",
        feedback: true,
        feedback_type: "ip",
        help: "",
        input_type: "text",
        default_value: "",
      },
      {
        option_name: "cluster_network",
        option_format: "default",
        optional: true,
        label: "cluster_network",
        feedback: true,
        feedback_type: "ip",
        help: "",
        input_type: "text",
        default_value: "",
      },
      {
        option_name: "hybrid_cluster",
        option_format: "default",
        optional: true,
        label: "hybrid_cluster",
        feedback: false,
        help: "",
        input_type: "checkbox",
        default_value: false,
      },
      {
        option_name: "block_db_size",
        option_format: "default",
        optional: true,
        label: "block_db_size",
        feedback: true,
        feedback_type: "num_unlim",
        help: "",
        input_type: "text",
        default_value: "-1",
      },
      {
        option_name: "dedicated_device_db",
        option_format: "per-host-toggle",
        toggle_options: [
          {
            option_name: "dedicated_devices",
            option_format: "multi-device-path",
            optional: false,
            label: "dedicated_devices",
            feedback: false,
            help: "",
            input_type: "button",
            default_value: "+",
            default_path: "/dev/disk/by-vdev/",
          },
        ],
        optional: true,
        label: "Use Dedicated Device DB",
        feedback: false,
        help: "",
        input_type: "checkbox",
        default_value: false,
      },
    ],
    unique: [],
    group: [],
  },
  metrics: {
    inventory_file: false,
    global: [],
    unique: [],
    group: [],
  },
  mdss: {
    inventory_file: false,
    global: [],
    unique: [],
    group: [],
  },
  smbs: {
    inventory_file: true,
    global: [],
    unique: [],
    group: [
      {
        option_name: "smb_configuration",
        option_format: "radio",
        radio_options: [
          {
            radio_id: "smb_active_directory",
            radio_value: "Active Directory Integration",
            radio_sub_options: [
              {
                option_name: "samba_server_ad",
                radio_option_name: "samba_server",
                option_format: "fixed-checkbox",
                optional: true,
                label: "samba_server",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: true,
              },
              {
                option_name: "samba_cluster_ad",
                radio_option_name: "samba_cluster",
                option_format: "fixed-checkbox",
                optional: true,
                label: "samba_cluster",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: true,
              },
              {
                option_name: "domain_member_ad",
                radio_option_name: "domain_member",
                option_format: "fixed-checkbox",
                optional: true,
                label: "domain_member",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: true,
              },
              {
                option_name: "active_directory_info",
                radio_option_name: "active_directory_info",
                option_format: "sub_form",
                sub_form_options: [
                  {
                    option_name: "workgroup",
                    option_format: "default",
                    optional: true,
                    label: "workgroup",
                    feedback: false,
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "idmap_range",
                    option_format: "default",
                    optional: true,
                    label: "idmap_range",
                    feedback: true,
                    feedback_type: "fixed",
                    feedback_choice_options: ["100000 - 999999"],
                    help: "",
                    input_type: "text",
                    default_value: "100000 - 999999",
                  },
                  {
                    option_name: "realm",
                    option_format: "default",
                    optional: true,
                    label: "realm",
                    feedback: false,
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "winbind_enum_groups",
                    option_format: "default",
                    optional: true,
                    label: "winbind_enum_groups",
                    feedback: true,
                    feedback_type: "fixed",
                    feedback_choice_options: ["no"],
                    help: "",
                    input_type: "text",
                    default_value: "no",
                  },
                  {
                    option_name: "winbind_enum_users",
                    option_format: "default",
                    optional: true,
                    label: "winbind_enum_users",
                    feedback: true,
                    feedback_type: "fixed",
                    feedback_choice_options: ["no"],
                    help: "",
                    input_type: "text",
                    default_value: "no",
                  },
                  {
                    option_name: "domain_join_user",
                    option_format: "default",
                    optional: true,
                    label: "domain_join_user",
                    feedback: false,
                    help: "",
                    input_type: "text",
                    default_value: "username",
                  },
                  {
                    option_name: "domain_join_password",
                    option_format: "default",
                    optional: true,
                    label: "domain_join_password",
                    feedback: false,
                    help: "",
                    input_type: "password",
                    default_value: "",
                  },
                ],
                optional: true,
                label: "active_directory_info",
                feedback: false,
                help: "",
                input_type: null,
                default_value: null,
              },
              {
                option_name: "ctdb_public_addresses_ad",
                radio_option_name: "ctdb_public_addresses",
                option_format: "multi-object",
                multi_object_options: [
                  {
                    option_name: "vip_address",
                    option_format: "default",
                    optional: false,
                    label: "vip_address",
                    feedback: true,
                    feedback_type: "ip",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "vip_interface",
                    option_format: "default",
                    optional: true,
                    label: "vip_interface",
                    feedback: true,
                    feedback_type: "name",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "subnet_mask",
                    option_format: "default",
                    optional: true,
                    label: "subnet_mask",
                    feedback: true,
                    feedback_type: "num",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                ],
                optional: true,
                label: "ctdb_public_addresses",
                feedback: false,
                help: "",
                input_type: "button",
                default_value: "+",
              },
              {
                option_name: "configure_shares_ad",
                radio_option_name: "configure_shares",
                option_format: "fixed-checkbox",
                optional: true,
                label: "configure_shares",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: false,
              },
            ],
          },
          {
            radio_id: "smb_local_users",
            radio_value: "Local Users",
            radio_sub_options: [
              {
                option_name: "samba_server_lu",
                radio_option_name: "samba_server",
                option_format: "fixed-checkbox",
                optional: true,
                label: "samba_server",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: true,
              },
              {
                option_name: "samba_cluster_lu",
                radio_option_name: "samba_cluster",
                option_format: "fixed-checkbox",
                optional: true,
                label: "samba_cluster",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: true,
              },
              {
                option_name: "domain_member_lu",
                radio_option_name: "domain_member",
                option_format: "fixed-checkbox",
                optional: true,
                label: "domain_member",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: false,
              },
              {
                option_name: "ctdb_public_addresses_lu",
                radio_option_name: "ctdb_public_addresses",
                option_format: "multi-object",
                multi_object_options: [
                  {
                    option_name: "vip_address",
                    option_format: "default",
                    optional: false,
                    label: "vip_address",
                    feedback: true,
                    feedback_type: "ip",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "vip_interface",
                    option_format: "default",
                    optional: false,
                    label: "vip_interface",
                    feedback: true,
                    feedback_type: "name",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                  {
                    option_name: "subnet_mask",
                    option_format: "default",
                    optional: false,
                    label: "subnet_mask",
                    feedback: true,
                    feedback_type: "num",
                    help: "",
                    input_type: "text",
                    default_value: "",
                  },
                ],
                optional: true,
                label: "ctdb_public_addresses",
                feedback: false,
                help: "",
                input_type: "button",
                default_value: "+",
              },
              {
                option_name: "configure_shares_lu",
                radio_option_name: "configure_shares",
                option_format: "fixed-checkbox",
                optional: true,
                label: "configure_shares",
                feedback: false,
                help: "",
                input_type: "checkbox",
                default_value: false,
              },
            ],
          },
        ],
        optional: true,
        label: "SMB Configuration",
        feedback: false,
        help: "",
        input_type: "radio",
        default_value: "Local Users",
      },
    ],
  },
  nfss: {
    inventory_file: true,
    global: [],
    unique: [],
    group: [
      {
        option_name: "nfs_configuration",
        option_format: "radio",
        radio_options: [
          {
            radio_id: "nfs_active_active",
            radio_value: "Active-Active",
            radio_sub_options: [
              {
                option_name: "ceph_nfs_rados_backend_driver_aa",
                radio_option_name: "ceph_nfs_rados_backend_driver",
                option_format: "default",
                optional: true,
                label: "ceph_nfs_rados_backend_driver",
                feedback: true,
                feedback_type: "fixed",
                feedback_choice_options: ["rados_cluster"],
                help: "",
                input_type: "text",
                default_value: "rados_cluster",
              },
            ],
          },
          {
            radio_id: "nfs_active_passive",
            radio_value: "Active-Passive",
            radio_sub_options: [
              {
                option_name: "ceph_nfs_rados_backend_driver_ap",
                radio_option_name: "ceph_nfs_rados_backend_driver",
                option_format: "default",
                optional: true,
                label: "ceph_nfs_rados_backend_driver",
                feedback: true,
                feedback_type: "fixed",
                feedback_choice_options: ["rados_ng"],
                help: "",
                input_type: "text",
                default_value: "rados_ng",
              },
              {
                option_name: "ceph_nfs_floating_ip_address",
                radio_option_name: "ceph_nfs_floating_ip_address",
                option_format: "default",
                optional: true,
                label: "ceph_nfs_floating_ip_address",
                feedback: true,
                feedback_type: "ip",
                help: "",
                input_type: "text",
                default_value: "",
              },
              {
                option_name: "ceph_nfs_floating_ip_cidr",
                radio_option_name: "ceph_nfs_floating_ip_cidr",
                option_format: "default",
                optional: true,
                label: "ceph_nfs_floating_ip_cidr",
                feedback: true,
                feedback_type: "num",
                help: "",
                input_type: "text",
                default_value: "",
              },
            ],
          },
        ],
        optional: true,
        label: "NFS Configuration",
        feedback: false,
        help: "",
        input_type: "radio",
        default_value: "Active-Active",
      },
    ],
  },
  iscsigws: {
    inventory_file: false,
    global: [],
    unique: [],
    group: [],
  },
  rgws: {
    inventory_file: false,
    global: [
      {
        option_name: "radosgw_civetweb_port",
        option_format: "default",
        optional: false,
        label: "radosgw_civetweb_port",
        feedback: true,
        feedback_type: "num",
        help: "",
        input_type: "text",
        default_value: "8080",
      },
      {
        option_name: "radosgw_frontend_type",
        option_format: "default",
        optional: false,
        label: "radosgw_frontend_type",
        feedback: false,
        help: "",
        input_type: "text",
        default_value: "beast",
      },
      {
        option_name: "radosgw_civetweb_num_threads",
        option_format: "default",
        optional: false,
        label: "radosgw_civetweb_num_threads",
        feedback: true,
        feedback_type: "num",
        help: "",
        input_type: "text",
        default_value: "512",
      },
    ],
    unique: [
      {
        option_name: "radosgw_address",
        option_format: "default",
        optional: false,
        label: "radosgw_address",
        feedback: true,
        feedback_type: "ip",
        help: "",
        input_type: "text",
        default_value: "",
      },
    ],
    group: [],
  },
  rgwloadbalancers: {
    inventory_file: true,
    global: [],
    unique: [],
    group: [
      {
        option_name: "haproxy_frontend_port",
        option_format: "default",
        optional: false,
        label: "haproxy_frontend_port",
        feedback: true,
        feedback_type: "num",
        help: "",
        input_type: "text",
        default_value: "80",
      },
      {
        option_name: "virtual_ips",
        option_format: "multi-ip",
        optional: false,
        label: "virtual_ips",
        feedback: false,
        help: "",
        input_type: "button",
        default_value: "+",
      },
      {
        option_name: "virtual_ip_netmask",
        option_format: "default",
        optional: false,
        label: "virtual_ip_netmask",
        feedback: true,
        feedback_type: "num",
        help: "",
        input_type: "text",
        default_value: "",
      },
      {
        option_name: "virtual_ip_interface",
        option_format: "default",
        optional: false,
        label: "virtual_ip_interface",
        feedback: true,
        feedback_type: "name",
        help: "",
        input_type: "text",
        default_value: "",
      },
      {
        option_name: "enable_ssl",
        option_format: "toggle_parent",
        toggle_options: [
          {
            option_name: "haproxy_frontend_ssl_port",
            option_format: "default",
            optional: false,
            label: "haproxy_frontend_ssl_port",
            feedback: true,
            feedback_type: "num",
            help: "",
            input_type: "text",
            default_value: "443",
          },
          {
            option_name: "haproxy_frontend_ssl_certificate",
            option_format: "default",
            optional: true,
            label: "haproxy_frontend_ssl_certificate",
            feedback: true,
            feedback_type: "path",
            help: "",
            input_type: "text",
            default_value: "",
          },
          {
            option_name: "haproxy_ssl_dh_param",
            option_format: "default",
            optional: true,
            label: "haproxy_ssl_dh_param",
            feedback: true,
            feedback_type: "num",
            help: "",
            input_type: "text",
            default_value: "4096",
          },
          {
            option_name: "haproxy_ssl_ciphers",
            option_format: "multi-checkbox",
            multi_checkbox_entries: [
              {
                label: "EECDH+AESGCM",
                default_value: true,
              },
              {
                label: "EDH+AESGCM",
                default_value: true,
              },
            ],
            optional: true,
            label: "haproxy_ssl_ciphers",
            feedback: false,
            help: "",
            input_type: "checkbox",
            default_value: true,
          },
          {
            option_name: "haproxy_ssl_options",
            option_format: "multi-checkbox",
            multi_checkbox_entries: [
              {
                label: "no-sslv3",
                default_value: true,
              },
              {
                label: "no-tlsv10",
                default_value: true,
              },
              {
                label: "no-tlsv11",
                default_value: true,
              },
              {
                label: "no-tls-tickets",
                default_value: true,
              },
            ],
            optional: true,
            label: "haproxy_ssl_options",
            feedback: false,
            help: "",
            input_type: "checkbox",
            default_value: true,
          },
        ],
        optional: true,
        label: "Enable SSL Options",
        feedback: false,
        help: "",
        input_type: "checkbox",
        default_value: false,
      },
    ],
  },
  client: {
    inventory_file: null,
    global: [],
    unique: [],
    group: [],
  },
};

let g_ceph_deploy_default_state = {
  "deploy-step-preconfig": {
    lock_state: "unlocked",
    step_content_id: "step-preconfig",
    progress: "0",
    unlock_requirements: [],
    playbook_completion_requirements: [],
  },
  "deploy-step-ansible-config": {
    lock_state: "locked",
    step_content_id: "step-ansible-config",
    progress: "0",
    unlock_requirements: ["deploy-step-preconfig"],
    playbook_completion_requirements: ["ping_all"],
  },
  "deploy-step-core": {
    lock_state: "locked",
    step_content_id: "step-core",
    progress: "0",
    unlock_requirements: ["deploy-step-ansible-config"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
    ],
  },
  "deploy-step-cephfs": {
    lock_state: "locked",
    step_content_id: "step-cephfs",
    progress: "0",
    unlock_requirements: ["deploy-step-core"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_cephfs",
    ],
  },
  "deploy-step-nfs": {
    lock_state: "locked",
    step_content_id: "step-nfs",
    progress: "0",
    unlock_requirements: ["deploy-step-cephfs"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_cephfs",
      "deploy_nfs",
    ],
  },
  "deploy-step-smb": {
    lock_state: "locked",
    step_content_id: "step-smb",
    progress: "0",
    unlock_requirements: ["deploy-step-cephfs"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_cephfs",
      "deploy_smb",
    ],
  },
  "deploy-step-rgw": {
    lock_state: "locked",
    step_content_id: "step-rgw",
    progress: "0",
    unlock_requirements: ["deploy-step-core"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_radosgw",
    ],
  },
  "deploy-step-rgwlb": {
    lock_state: "locked",
    step_content_id: "step-rgwlb",
    progress: "0",
    unlock_requirements: ["deploy-step-rgw"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_radosgw",
      "deploy_rgwlb",
    ],
  },
  "deploy-step-iscsi": {
    lock_state: "locked",
    step_content_id: "step-iscsi",
    progress: "0",
    unlock_requirements: ["deploy-step-core"],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_iscsi",
    ],
  },
  "deploy-step-dashboard": {
    lock_state: "locked",
    step_content_id: "step-dashboard",
    progress: "0",
    unlock_requirements: [
      "deploy-step-rgw",
      "deploy-step-iscsi",
      "deploy-step-nfs",
      "deploy-step-smb",
      "deploy-step-core",
    ],
    playbook_completion_requirements: [
      "ping_all",
      "device_alias",
      "deploy_core",
      "deploy_dashboard",
    ],
  },
};

/**
 * Display a short message at the bottom of the screen.
 * @param {string} msg_label
 * @param {string} msg_content
 * @param {string} msg_color
 * @param {string} id
 */
function show_snackbar_msg(msg_label, msg_content, msg_color, id) {
  var snackbar = document.getElementById(id);
  if (snackbar != null) {
    snackbar.innerHTML = msg_label + msg_content;
    snackbar.style.backgroundColor = msg_color;
    snackbar.className = "show";
    setTimeout(function () {
      snackbar.className = snackbar.className.replace("show", "");
    }, 5000);
  }
}

/**
 * obtains the "houston-theme-state" from local storage and sets the state accordingly.
 */
function set_last_theme_state() {
  var toggle_switch = document.getElementById("toggle-theme");
  var state = localStorage.getItem("houston-theme-state");
  var icon = document.getElementById("houston-theme-icon");
  if (state === "light") {
    toggle_switch.checked = false;
    document.documentElement.setAttribute("data-theme", "light");
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  } else if (state === "dark") {
    toggle_switch.checked = true;
    document.documentElement.setAttribute("data-theme", "dark");
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  } else {
    toggle_switch.checked = false;
    state = "light";
    localStorage.setItem("houston-theme-state", state);
  }
}

/**
 * handler invoked when the theme switch is clicked.
 * @param {event} e
 */
function switch_theme(/*event*/ e) {
  var icon = document.getElementById("houston-theme-icon");
  var state = "";
  if (e.target.checked) {
    state = "dark";
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
  } else {
    state = "light";
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
  }
  document.documentElement.setAttribute("data-theme", state);
  localStorage.setItem("houston-theme-state", state);
}

/**
 * adds a host using the core_params script. "new-hostname-field" and "new-interface-field" are used.
 * on successful completion, modal dialog "add-host-modal" is hidden, and get_param_file_content
 * is called.
 */
function add_host_request() {
  let hostname = document.getElementById("new-hostname-field").value;
  if (hostname != null && hostname != "") {
    host_request_json = { [hostname]: { hostname: "" } };
    host_request_json[hostname]["hostname"] = hostname;
    var spawn_args = [
      "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
      "-h",
      JSON.stringify(host_request_json),
      "-w",
    ];
    var result_json = null;
    var proc = cockpit.spawn(spawn_args, { superuser: "require" });
    proc.done(function (data) {
      var msg_label = "";
      var msg_content = "";
      var msg_color = "";
      try {
        result_json = JSON.parse(data);
      } catch (e) {
        msg_color = "#bd3030";
        msg_label = "Error:";
        msg_content = "Unexpected return value.";
      }
      if (result_json.hasOwnProperty("success_msg")) {
        msg_color = "#20a030";
        msg_label = "Add Host: ";
        msg_content = "Host Added Succcessfully.";
        check_for_parameter_change(result_json);
      } else {
        msg_color = "#bd3030";
        msg_label = "Error:";
        msg_content = "Unexpected return value.";
      }
      hide_modal_dialog("add-host-modal");
      get_param_file_content();
      show_snackbar_msg(msg_label, msg_content, msg_color, "add-host-snackbar");
    });
    proc.fail(function (ex, data) {
      document.getElementById("add-host-result-msg").style.display = "block";
      var msg_label = document.getElementById("add-host-result-msg-label");
      msg_label.innerHTML = "Error:";
      var msg_content = document.getElementById("add-host-result-msg-content");
      try {
        result_json = JSON.parse(data);
      } catch (e) {
        msg_content.innerHTML = "Unable to add host";
      }
      if (result_json.hasOwnProperty("error_msg")) {
        msg_content.innerHTML = result_json.error_msg;
      } else {
        msg_content.innerHTML = "Unable to add host";
      }
    });
  }
}

/**
 * shows the add-host-modal dialog window.
 */
function add_host() {
  document.getElementById("add-host-modal-title").innerText = "Add New Host";

  let hostname_field = document.getElementById("new-hostname-field");
  hostname_field.value = "";

  show_modal_dialog("add-host-modal");
  hostname_field.addEventListener("input", function () {
    check_name_field(
      "new-hostname-field",
      "new-hostname-field-feedback",
      "continue-add-host",
      "hostname",
      true
    );
  });
  document
    .getElementById("close-add-host")
    .addEventListener("click", function () {
      hide_modal_dialog("add-host-modal");
    });
  document
    .getElementById("cancel-add-host")
    .addEventListener("click", function () {
      hide_modal_dialog("add-host-modal");
    });
  document
    .getElementById("continue-add-host")
    .addEventListener("click", add_host_request);
  document.getElementById("continue-add-host").innerText = "Add";
}

/**
 * Checks to see if the text entered in a field is a valid hostname.
 * @param {string} name_field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @returns {boolean}
 */
function check_name_field(
  name_field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag
) {
  var field_text = document.getElementById(name_field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (field_text.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (
    field_text.length > 0 &&
    !field_text.match(/^[a-z_][a-z0-9_.-]*[$]?$/)
  ) {
    button.disabled = true;
    var invalid_chars = [];
    if (field_text[0].match(/[^a-z_]/))
      invalid_chars.push("'" + field_text[0] + "'");
    for (let char of field_text.slice(1, -1))
      if (char.match(/[^a-z0-9_.-]/)) invalid_chars.push("'" + char + "'");
    if (field_text[field_text.length - 1].match(/[^a-z0-9_.\-$]/))
      invalid_chars.push("'" + field_text[field_text.length - 1] + "'");
    info_message.innerText =
      label_name +
      " contains invalid characters: \n" +
      invalid_chars.join(", ");
    return false;
  }
  button.disabled = false;
  return true;
}

/**
 * Checks to see if the text entered in a field is a valid hostname.
 * @param {string} name_field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @returns {boolean}
 */
function check_device_path_field(
  path_field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag
) {
  var field_text = document.getElementById(path_field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (field_text.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (
    field_text.length > 0 &&
    !field_text.match(/^(\/dev\/disk\/by-vdev\/){1}([^\/])+$/)
  ) {
    button.disabled = true;
    info_message.innerText =
      label_name +
      " Must start with '/dev/disk/by-vdev/' and must not end with '/'";
    return false;
  }
  button.disabled = false;
  return true;
}

/**
 * Checks to see if the text entered in a field contains an entry in the choice list.
 * @param {string} name_field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @param {Array} choice_list
 * @returns {boolean}
 */
function check_choice_field(
  name_field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag,
  choice_list
) {
  var field_text = document.getElementById(name_field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (field_text.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (field_text.length > 0) {
    let match = false;
    for (let choice of choice_list) {
      if (field_text == choice) {
        match = true;
      }
    }
    if (!match) {
      button.disabled = true;
      info_message.innerText =
        label_name +
        " must be one of the following: \n" +
        choice_list.join(", ");
      return false;
    }
  }
  button.disabled = false;
  return true;
}

/**
 * Checks to see if the text entered in a field contains only numeric characters
 * @param {string} name_field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @returns {boolean}
 */
function check_num_field(
  name_field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag
) {
  var field_text = document.getElementById(name_field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (field_text.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (field_text.length > 0 && !/^[0-9]*[$]?$/.test(field_text)) {
    button.disabled = true;
    var invalid_chars = [];
    for (let char of field_text)
      if (/[^0-9]/.test(char)) invalid_chars.push("'" + char + "'");
    info_message.innerText =
      label_name +
      " contains non-numeric characters: \n" +
      invalid_chars.join(", ");
    return false;
  }
  button.disabled = false;
  return true;
}

/**
 * Checks to see if the text entered in a field contains only numeric characters or -1 for unlimited
 * @param {string} name_field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @returns {boolean}
 */
function check_num_unlim_field(
  name_field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag
) {
  var field_text = document.getElementById(name_field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (field_text.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (
    field_text.length > 0 &&
    !/^[0-9]*[$]?$/.test(field_text) &&
    field_text != "-1"
  ) {
    button.disabled = true;
    var invalid_chars = [];
    for (let char of field_text)
      if (/[^0-9]/.test(char)) invalid_chars.push("'" + char + "'");
    info_message.innerText =
      label_name +
      " contains non-numeric characters: \n" +
      invalid_chars.join(", ");
    return false;
  }
  button.disabled = false;
  return true;
}

/**
 * provides feedback on whether a given field contains a valid IP address.
 * @param {string} field_id
 * @param {string} feedback_field_id
 * @param {string} button_id
 * @param {string} label_name
 * @param {boolean} required_flag
 * @returns {boolean}
 */
function check_ip_field(
  field_id,
  feedback_field_id,
  button_id,
  label_name,
  required_flag
) {
  var ip_string = document.getElementById(field_id).value;
  var button = document.getElementById(button_id);
  var info_message = document.getElementById(feedback_field_id);
  info_message.innerText = " ";
  if (ip_string.length === 0 && required_flag) {
    button.disabled = true;
    info_message.innerText = label_name + " cannot be empty.";
    return false;
  } else if (ip_string.length > 0 && !validate_ip_address(ip_string)) {
    info_message.innerText = label_name + " invalid ip format.";
    button.disabled = true;
    return false;
  }
  button.disabled = false;
  return true;
}

/**
 * a regular expression that determines if a string constitutes a valid ipv4 or ipv6 address.
 * @param {string} ipaddress
 * @returns {boolean}
 */
function validate_ip_address(ipaddress) {
  let ipv6 =
    /^((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:)))(%.+)?((\/){1}(1?2?[0-8]|1?[0-1][0-9]|[1-9]?[0-9]))?\s*$/.test(
      ipaddress
    );
  let ipv4 =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)((\/){1}([1-2]?[0-9]|3[0-2]))?$/.test(
      ipaddress
    );
  return ipv4 || ipv6;
}

/**
 * displays the modal dialog window with the provided id.
 * @param {string} id
 */
function show_modal_dialog(id) {
  var modal = document.getElementById(id);
  modal.style.display = "block";
}

/**
 * hides the modal dialog window with the provided id.
 * @param {string} id
 */
function hide_modal_dialog(id) {
  var modal = document.getElementById(id);
  modal.style.display = "none";
  document.getElementById("add-host-result-msg").style.display = "none";
  document.getElementById("new-hostname-field").value = "";
}

/**
 * creates a table with checkboxes that represents which roles are assigned
 * to a given host.
 * @param {Object} hosts_json
 * @param {Object} roles_json
 */
function update_role_info(hosts_json, roles_json) {
  //clear out the role-div element
  let role_div = document.getElementById("role-div");
  if (role_div != null) {
    role_div.innerHTML = "";
  }

  //create the new role table
  let role_table = document.createElement("table");
  role_table.classList.add("role-table");
  role_table.id = "role-table";

  //create a blank th entry to start then create a header for each role
  let role_table_header_row = document.createElement("tr");
  role_table_header_row.classList.add("cd-table-header-row");
  role_table_header_row.appendChild(document.createElement("th"));
  for (let key of Object.keys(roles_json)) {
    let th = document.createElement("th");
    th.innerText = key;
    role_table_header_row.appendChild(th);
  }
  role_table.appendChild(role_table_header_row); //add header row to table

  //create a new row for each host
  for (let host_key of Object.keys(hosts_json)) {
    let role_table_host_row = document.createElement("tr");
    role_table_host_row.id = "role-table-host-row-" + host_key; // eg: id="role-table-host-row-hostname1"
    role_table_host_row.classList.add("role-table-host-row");
    let role_table_host_name = document.createElement("td");
    role_table_host_name.innerText = host_key;
    role_table_host_row.appendChild(role_table_host_name);
    for (let role_key of Object.keys(roles_json)) {
      //create a cell and checkbox for each role.
      let role_checkbox_td = document.createElement("td");
      let role_checkbox = document.createElement("input");
      role_checkbox.type = "checkbox";
      role_checkbox.classList.add("cd-checkbox");
      role_checkbox.id = role_key + "-" + host_key + "-checkbox"; //eg "osds-hostname1-checkbox"
      if (roles_json[role_key].includes(host_key)) {
        // ensure that checkbox is pre-checked if hostname is found in role list.
        role_checkbox.checked = true;
      }
      role_checkbox.addEventListener("change", function () {
        document.getElementById("update-roles-btn").removeAttribute("disabled");
      });
      role_checkbox_td.appendChild(role_checkbox);
      role_table_host_row.appendChild(role_checkbox_td);
    }
    role_table.appendChild(role_table_host_row); // add row to table
  }
  role_div.appendChild(role_table); // add table to div
  document.getElementById("update-roles-btn").disabled = true; // diable the update roles button
  let role_content = document.getElementById("role-content");
  let placeholder = document.getElementById("cd-role-placeholder");
  if (role_content && placeholder) {
    if (role_table.getElementsByTagName("tr").length === 1) {
      role_content.classList.add("hidden");
      placeholder.classList.remove("hidden");
    } else {
      role_content.classList.remove("hidden");
      placeholder.classList.add("hidden");
    }
  }
}

function modify_inventory_file_requirement(role, add_requirement) {
  let inv_file_params = {
    rgwloadbalancers: {
      file_name: "rgwloadbalancers.yml",
      div_id: "rgwloadbalancers-inv-panel",
    },
    nfss: {
      file_name: "nfss.yml",
      div_id: "nfss-inv-panel",
    },
    smbs: {
      file_name: "smbs.yml",
      div_id: "smbs-inv-panel",
    },
  };

  if (add_requirement) {
    //we need to ensure that this requirement is added to the list of required inventory files.
    let inv_file_req_str =
      localStorage.getItem("inventory_files") ??
      JSON.stringify(g_inv_default_requirements);
    let inv_file_req_obj = JSON.parse(inv_file_req_str);
    if (!inv_file_req_obj.hasOwnProperty(inv_file_params[role].file_name)) {
      inv_file_req_obj[inv_file_params[role].file_name] = {};
      inv_file_req_obj[inv_file_params[role].file_name].content = null;
      inv_file_req_obj[inv_file_params[role].file_name].completed = false;
    }
    localStorage.setItem("inventory_files", JSON.stringify(inv_file_req_obj));

    let target_div = document.getElementById(inv_file_params[role].div_id);
    if (target_div) {
      target_div.classList.remove("hidden");
      Object.entries(inv_file_req_obj).forEach(([key, obj]) => {
        if (!obj.completed) {
          let next_button = document.getElementById("ansible-config-inv-nxt");
          if (next_button) {
            next_button.disabled = true;
          }
        }
      });
    }
  } else {
    //we need to hide the inventory file generation content, and remove this from the list of requirements
    let inv_file_req_str =
      localStorage.getItem("inventory_files") ??
      JSON.stringify(g_inv_default_requirements);
    let inv_file_req_obj = JSON.parse(inv_file_req_str);
    if (inv_file_req_obj.hasOwnProperty(inv_file_params[role].file_name)) {
      delete inv_file_req_obj[inv_file_params[role].file_name];
    }
    localStorage.setItem("inventory_files", JSON.stringify(inv_file_req_obj));

    if (inventory_file_generation_completed_check()) {
      document
        .getElementById("ansible-config-inv-nxt")
        .removeAttribute("disabled");
    } else {
      document.getElementById("ansible-config-inv-nxt").disabled = true;
    }

    let target_div = document.getElementById(inv_file_params[role].div_id);
    if (target_div) {
      target_div.classList.add("hidden");
    }
  }
}

/**
 * updates the text fields based on the values of the options_json provided.
 * This will also forbid progress (by disabling the next button) if the required fields
 * are not filled in.
 * @param {Object} hosts_json
 * @param {Object} roles_json
 * @param {Object} options_json
 * @param {Object} groups_json
 */
function update_options_info(
  hosts_json,
  roles_json,
  options_json,
  groups_json
) {
  let options_div = document.getElementById("ansible-config-options");
  if (options_div) {
    options_div.innerHTML = ""; //erase everything within the options div.
    //create a box to house all global and per-host options
    let all_option_div = document.createElement("div");
    all_option_div.classList.add("panel", "panel-default", "cd-option-panel");

    let all_section_header = document.createElement("div");
    all_section_header.classList.add("cd-row", "cd-panel-heading");

    let all_section_header_text = document.createElement("h3");
    all_section_header_text.classList.add("panel-title", "cd-row-child");
    all_section_header_text.innerText = "Global Options";
    all_section_header.appendChild(all_section_header_text);

    let all_section_body = document.createElement("div");
    all_section_body.classList.add("cd-panel-body");
    if (g_all_option_scheme["all"].global.length > 0) {
      let all_form = document.createElement("div");
      all_form.classList.add("ct-form");
      all_form.id = "all";
      make_global_options(
        all_section_body,
        all_form,
        g_all_option_scheme["all"].global,
        options_json,
        hosts_json,
        roles_json,
        "all"
      );
      all_option_div.appendChild(all_section_header);
      all_option_div.appendChild(all_section_body);
      options_div.appendChild(all_option_div);
    }

    //create global and per-host options for each role type
    Object.entries(roles_json).forEach(([role, host_list]) => {
      //loop through each role in the roles_json
      if (
        host_list.length > 0 &&
        (g_option_scheme[role].global.length > 0 ||
          g_option_scheme[role].group.length > 0 ||
          g_option_scheme[role].unique.length > 0)
      ) {
        // At least one host is assigned this role
        if (g_option_scheme[role].inventory_file) {
          modify_inventory_file_requirement(role, true);
        }

        //create a box to house all global and per-host options
        let role_option_div = document.createElement("div");
        role_option_div.classList.add(
          "panel",
          "panel-default",
          "cd-option-panel"
        );

        let section_header = document.createElement("div");
        section_header.classList.add("cd-row", "cd-panel-heading");

        let section_header_text = document.createElement("h3");
        section_header_text.classList.add("panel-title", "cd-row-child");
        section_header_text.innerText = "Options [" + role + "]: ";
        section_header.appendChild(section_header_text);

        let section_body = document.createElement("div");
        section_body.classList.add("cd-panel-body");
        if (g_option_scheme[role].global.length > 0) {
          // global options (these will end up in all.yml)
          let global_option_p = document.createElement("p");
          global_option_p.classList.add("cd-para");
          global_option_p.innerText = "Global Options: ";
          section_body.appendChild(global_option_p);

          let global_form = document.createElement("div");
          global_form.classList.add("ct-form");
          global_form.id = role;
          make_global_options(
            section_body,
            global_form,
            g_option_scheme[role].global,
            options_json,
            hosts_json,
            roles_json,
            role
          );
        }

        // group options end up in group_vars/{group name}.yml
        if (host_list.length > 0 && g_option_scheme[role].group.length > 0) {
          let group_option_p = document.createElement("p");
          group_option_p.classList.add("cd-para");
          group_option_p.innerText =
            "Group Options: (/usr/share/ceph-ansible/group_vars/" +
            role +
            ".yml)";
          section_body.appendChild(group_option_p);

          let group_form = document.createElement("div");
          group_form.classList.add("ct-form");
          section_body.appendChild(group_form);
          make_group_options(
            section_body,
            group_form,
            g_option_scheme[role].group,
            role,
            groups_json
          );
        }

        // per-host options
        if (host_list.length > 0 && g_option_scheme[role].unique.length > 0) {
          let host_option_p = document.createElement("p");
          host_option_p.classList.add("cd-para");
          host_option_p.innerText = "Per-host Options: ";
          section_body.appendChild(host_option_p);
          make_per_host_options(section_body, host_list, role, hosts_json);
        }
        role_option_div.appendChild(section_header);
        role_option_div.appendChild(section_body);
        options_div.appendChild(role_option_div);
      } else if (g_option_scheme[role].inventory_file) {
        modify_inventory_file_requirement(role, false);
      }
    });
  }

  document.getElementById("global-options-btn").disabled = true;

  let required_list = options_div.querySelectorAll(
    ':scope input[optional="false"]'
  );

  let next_btn = document.getElementById("ansible-config-add-options-nxt");
  next_btn.removeAttribute("disabled");
  required_list.forEach((element) => {
    if (element.value == "") {
      if (element.getAttribute("opt-parent")) {
        let parent_div = options_div.querySelectorAll(
          `:scope div[opt-parent=${element.getAttribute("opt-parent")}]`
        );
        if (!parent_div[0].classList.contains("hidden")) {
          next_btn.disabled = true;
          next_btn.title = "To proceed, fill in required fields.";
        }
      } else {
        next_btn.disabled = true;
        next_btn.title = "To proceed, fill in required fields.";
      }
    }
  });
}

function make_global_options(
  target_div,
  target_form,
  option_list,
  options_json,
  hosts_json,
  roles_json,
  role
) {
  for (let opt of option_list) {
    // loop through each option in the option scheme and create fields
    // for each global option.
    let opt_wrapper = document.createElement("div");
    opt_wrapper.classList.add("ct-validation-wrapper");

    let opt_label = document.createElement("label");
    opt_label.classList.add("control-label");
    opt_label.setAttribute("for", opt.option_name);
    opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;
    target_form.appendChild(opt_label);

    let opt_input = document.createElement("input");
    if (opt.option_format === "default") {
      opt_input.setAttribute("option_format",opt.option_format);
      if (opt.input_type === "text") {
        // make a text field
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field");
        opt_input.value =
          options_json.hasOwnProperty(opt.option_name) &&
          options_json[opt.option_name] != ""
            ? options_json[opt.option_name]
            : opt.default_value;
      } else if (opt.input_type === "checkbox") {
        // make a checkbox
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.checked = options_json.hasOwnProperty(opt.option_name)
          ? options_json[opt.option_name]
          : false;
        opt_input.addEventListener("change", function () {
          document
            .getElementById("global-options-btn")
            .removeAttribute("disabled");
        });
      }
      opt_input.setAttribute("aria-invalid", "false");
      opt_input.id = opt.option_name;
      opt_input.setAttribute("global-option", true);
      opt_input.setAttribute("optional", opt.optional);

      opt_wrapper.appendChild(opt_input);

      if (opt.feedback) {
        let feedback = generate_option_feedback(
          opt,
          opt_input,
          opt.option_name + "-feedback"
        );
        opt_wrapper.appendChild(feedback);
      }
      target_form.appendChild(opt_wrapper);
      target_div.appendChild(target_form);
    } else if (opt.option_format === "per-host-toggle") {
      let toggle_form = document.createElement("div");
      toggle_form.classList.add("ct-form");
      toggle_form.setAttribute("opt-parent", opt.option_name);
      toggle_form.id = opt.option_name + "-toggle_form";

      make_per_host_toggle_options(
        toggle_form,
        opt,
        role,
        hosts_json,
        roles_json
      );

      opt_input.type = opt.input_type;
      opt_input.classList.add("ct-input", "cd-field-checkbox");
      opt_input.setAttribute("aria-invalid", "false");
      opt_input.id = opt.option_name;
      opt_input.setAttribute("group", role);
      opt_input.setAttribute("field", opt.option_name);
      opt_input.setAttribute("optional", opt.optional);
      opt_input.setAttribute("global-option", true);
      opt_input.setAttribute("option_format", opt.option_format);
      opt_input.checked = options_json.hasOwnProperty(opt.option_name)
        ? options_json[opt.option_name]
        : opt.default_value;
      if (opt_input.checked) {
        toggle_form.classList.remove("hidden");
      } else {
        toggle_form.classList.add("hidden");
      }

      opt_input.addEventListener("change", () => {
        let update_btn = document.getElementById("global-options-btn");
        if (opt_input.checked) {
          toggle_form.classList.remove("hidden");
        } else {
          toggle_form.classList.add("hidden");
          update_btn.removeAttribute("disabled");
        }
      });

      let opt_enable_wrapper = document.createElement("div");
      opt_enable_wrapper.classList.add("cd-checkbox-wrapper");
      opt_enable_wrapper.appendChild(opt_input);
      opt_enable_wrapper.style.marginTop = "10px";

      let enable_switch = document.createElement("label");
      enable_switch.classList.add("cd-switch");
      let slider = document.createElement("span");
      slider.classList.add("cd-slider", "round");

      enable_switch.appendChild(opt_input);
      enable_switch.appendChild(slider);
      opt_enable_wrapper.appendChild(enable_switch);
      opt_wrapper.appendChild(opt_enable_wrapper);
      target_form.appendChild(opt_wrapper);
      target_div.appendChild(toggle_form);
    } else if (opt.option_format === "global-toggle") {
      let toggle_form = document.createElement("div");
      toggle_form.classList.add("ct-form");
      toggle_form.setAttribute("opt-parent", opt.option_name);
      toggle_form.id = opt.option_name + "-toggle_form";

      make_global_toggle_options(toggle_form, opt, role, options_json);

      opt_input.type = opt.input_type;
      opt_input.classList.add("ct-input", "cd-field-checkbox");
      opt_input.setAttribute("aria-invalid", "false");
      opt_input.id = opt.option_name;
      opt_input.setAttribute("group", role);
      opt_input.setAttribute("field", opt.option_name);
      opt_input.setAttribute("optional", opt.optional);
      opt_input.setAttribute("global-option", true);
      opt_input.setAttribute("option_format", opt.option_format);
      opt_input.checked = options_json.hasOwnProperty(opt.option_name)
        ? options_json[opt.option_name]
        : opt.default_value;
      if (opt_input.checked) {
        toggle_form.classList.remove("hidden");
      } else {
        toggle_form.classList.add("hidden");
      }

      opt_input.addEventListener("change", () => {
        let update_btn = document.getElementById("global-options-btn");
        if (opt_input.checked) {
          toggle_form.classList.remove("hidden");
        } else {
          toggle_form.classList.add("hidden");
          update_btn.removeAttribute("disabled");
        }
      });

      let opt_enable_wrapper = document.createElement("div");
      opt_enable_wrapper.classList.add("cd-checkbox-wrapper");
      //opt_enable_wrapper.appendChild(opt_input);
      opt_enable_wrapper.style.marginTop = "10px";

      let enable_switch = document.createElement("label");
      enable_switch.classList.add("cd-switch");
      let slider = document.createElement("span");
      slider.classList.add("cd-slider", "round");

      enable_switch.appendChild(opt_input);
      enable_switch.appendChild(slider);
      opt_enable_wrapper.appendChild(enable_switch);
      opt_wrapper.appendChild(opt_enable_wrapper);
      target_form.appendChild(opt_wrapper);
      target_div.appendChild(target_form);
      target_form.appendChild(toggle_form);
    }
  }
}

function make_per_host_options(target_div, host_list, role, hosts_json) {
  for (let i = 0; i < host_list.length; i++) {
    let host_option_div = document.createElement("div");
    host_option_div.classList.add("panel", "panel-default", "cd-option-panel");

    let host_option_panel_heading = document.createElement("div");
    host_option_panel_heading.classList.add("cd-row", "cd-panel-heading");
    host_option_panel_heading.innerText = host_list[i];

    let host_option_panel_body = document.createElement("div");
    host_option_panel_body.classList.add("cd-panel-body");

    let host_form = document.createElement("div");
    host_form.classList.add("ct-form");

    for (let opt of g_option_scheme[role].unique) {
      let opt_wrapper = document.createElement("div");
      opt_wrapper.classList.add("ct-validation-wrapper");

      let opt_label = document.createElement("label");
      opt_label.classList.add("control-label");
      opt_label.setAttribute("for", opt.option_name + "-" + host_list[i]);
      opt_label.innerText = (opt.optional ? "" : "* ") + opt.option_name;
      host_form.appendChild(opt_label);

      let opt_input = document.createElement("input");
      if (opt.input_type === "text") {
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field");
        opt_input.value = hosts_json[host_list[i]].hasOwnProperty(
          opt.option_name
        )
          ? hosts_json[host_list[i]][opt.option_name]
          : opt.default_value;
      } else if (opt.input_type === "checkbox") {
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.addEventListener("change", function () {
          document
            .getElementById("global-options-btn")
            .removeAttribute("disabled");
        });
      }
      opt_input.setAttribute("aria-invalid", "false");
      opt_input.id = opt.option_name + "-" + host_list[i];
      opt_input.setAttribute("hostname", host_list[i]);
      opt_input.setAttribute("field", opt.option_name);
      opt_input.setAttribute("optional", opt.optional);
      opt_input.setAttribute("host-option", true);
      opt_input.setAttribute("option_format", opt.option_format);

      opt_wrapper.appendChild(opt_input);

      if (opt.feedback) {
        let feedback = generate_option_feedback(
          opt,
          opt_input,
          opt.option_name + "-" + host_list[i] + "-feedback"
        );
        opt_wrapper.appendChild(feedback);
      }
      host_form.appendChild(opt_wrapper);
    }
    host_option_panel_body.appendChild(host_form);
    host_option_div.appendChild(host_option_panel_heading);
    host_option_div.appendChild(host_option_panel_body);
    target_div.appendChild(host_option_div);
  }
}

function make_group_options(
  target_div,
  target_form,
  group_options,
  role,
  groups_json
) {
  for (let opt of group_options) {
    let opt_wrapper = document.createElement("div");
    opt_wrapper.classList.add("ct-validation-wrapper");

    let opt_label = document.createElement("label");
    opt_label.classList.add("control-label");
    opt_label.setAttribute("for", opt.option_name);
    opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;

    let opt_input = document.createElement("input");
    if (opt.option_format) {
      if (opt.option_format == "toggle_parent") {
        let toggle_form = document.createElement("div");
        toggle_form.classList.add("ct-form");
        toggle_form.setAttribute("opt-parent", opt.option_name);

        target_div.appendChild(toggle_form);
        make_toggle_options(toggle_form, opt, role, groups_json);

        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_input.checked =
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.option_name)
            ? groups_json[role][opt.option_name]
            : opt.default_value;
        if (opt_input.checked) {
          toggle_form.classList.remove("hidden");
        } else {
          toggle_form.classList.add("hidden");
        }

        opt_input.addEventListener("change", () => {
          let update_btn = document.getElementById("global-options-btn");
          if (opt_input.checked) {
            toggle_form.classList.remove("hidden");
          } else {
            toggle_form.classList.add("hidden");
          }
          update_btn.removeAttribute("disabled");
        });

        let opt_enable_wrapper = document.createElement("div");
        opt_enable_wrapper.classList.add("cd-checkbox-wrapper");
        opt_enable_wrapper.appendChild(opt_input);
        opt_enable_wrapper.style.marginTop = "10px";

        let enable_switch = document.createElement("label");
        enable_switch.classList.add("cd-switch");
        let slider = document.createElement("span");
        slider.classList.add("cd-slider", "round");

        enable_switch.appendChild(opt_input);
        enable_switch.appendChild(slider);
        opt_enable_wrapper.appendChild(enable_switch);
        opt_wrapper.appendChild(opt_enable_wrapper);
      } else if (opt.option_format == "radio") {
        opt_input = document.createElement("div");
        opt_input.classList.add("cd-radio-row");
        opt_input.id = opt.option_name;
        for (let radio_opt of opt.radio_options) {
          let radio_input = document.createElement("input");
          radio_input.type = "radio";
          radio_input.id = radio_opt.radio_id;
          radio_input.name = opt.option_name;
          radio_input.value = radio_opt.radio_value;
          let radio_label = document.createElement("label");
          radio_label.setAttribute("for", radio_opt.radio_id);
          radio_label.innerText = radio_opt.radio_value;
          opt_input.appendChild(radio_input);
          opt_input.appendChild(radio_label);

          let radio_form = document.createElement("div");
          radio_form.classList.add("ct-form");
          radio_form.setAttribute("opt-parent", radio_input.id);
          target_div.appendChild(radio_form);
          make_radio_options(radio_form, radio_opt, role, groups_json);

          radio_input.checked =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(radio_opt.radio_id)
              ? groups_json[role][radio_opt.radio_id]
              : opt.default_value == radio_input.value;

          if (radio_input.checked) {
            radio_form.classList.remove("hidden");
          } else {
            radio_form.classList.add("hidden");
          }

          radio_input.addEventListener("change", () => {
            let update_btn = document.getElementById("global-options-btn");
            if (radio_input.checked) {
              radio_form.classList.remove("hidden");
            } else {
              radio_form.classList.add("hidden");
            }
            let radio_btn_list = [
              ...opt_input.querySelectorAll(
                `:scope input[name=${opt_input.id}]`
              ),
            ];
            radio_btn_list.forEach((radio_btn) => {
              if (radio_btn && radio_btn.id != radio_input.id) {
                let div_to_hide = target_div.querySelector(
                  `:scope div[opt-parent="${radio_btn.id}"]`
                );
                if (div_to_hide) {
                  div_to_hide.classList.add("hidden");
                }
              }
            });
            update_btn.removeAttribute("disabled");
          });
        }
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
      } else if (opt.option_format == "multi-checkbox") {
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        if (
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.option_name)
        ) {
          opt_input.checked =
            groups_json[role][opt.option_name].length > 0 ? true : false;
        } else {
          opt_input.checked = opt.default_value;
        }

        opt_input.addEventListener("change", () => {
          let sub_opt_div = opt_wrapper.querySelector(
            `:scope [opt-parent="${opt_input.id}"]`
          );
          let update_btn = document.getElementById("global-options-btn");
          if (!sub_opt_div || !update_btn) return;
          if (opt_input.checked) {
            sub_opt_div.classList.remove("hidden");
          } else {
            sub_opt_div.classList.add("hidden");
          }
          update_btn.removeAttribute("disabled");
        });

        let opt_enable_wrapper = document.createElement("div");
        opt_enable_wrapper.classList.add("cd-checkbox-wrapper");
        opt_enable_wrapper.appendChild(opt_input);
        opt_enable_wrapper.style.marginTop = "10px";

        let enable_switch = document.createElement("label");
        enable_switch.classList.add("cd-switch");
        let slider = document.createElement("span");
        slider.classList.add("cd-slider", "round");

        let sub_opt_wrapper = document.createElement("div");
        sub_opt_wrapper.setAttribute("opt-parent", opt.option_name);
        if (opt_input.checked) {
          sub_opt_wrapper.classList.remove("hidden");
        } else {
          sub_opt_wrapper.classList.add("hidden");
        }

        enable_switch.appendChild(opt_input);
        enable_switch.appendChild(slider);
        opt_enable_wrapper.appendChild(enable_switch);
        opt_wrapper.appendChild(opt_enable_wrapper);

        for (let sub_opt of opt.multi_checkbox_entries) {
          let wrapper = document.createElement("div");
          wrapper.classList.add("cd-checkbox-wrapper");

          let box_div = document.createElement("div");
          box_div.classList.add("cd-checkbox-wrapper");

          let box_label = document.createElement("label");
          box_label.classList.add("control-label");
          box_label.setAttribute("for", sub_opt.label);
          box_label.innerText = sub_opt.label;

          let box = document.createElement("input");
          box.type = "checkbox";
          box.classList.add("ct-input", "cd-field-checkbox");
          box.setAttribute("opt-parent", opt.option_name);
          box.setAttribute("field", sub_opt.label);
          if (
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name)
          ) {
            box.checked = groups_json[role][opt.option_name].find(
              (str) => str === sub_opt.label
            )
              ? true
              : false;
          } else {
            box.checked = sub_opt.default_value;
          }
          box.addEventListener("change", () => {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });

          box_div.appendChild(box);
          wrapper.appendChild(box_div);
          wrapper.appendChild(box_label);
          sub_opt_wrapper.appendChild(wrapper);
        }
        opt_wrapper.appendChild(sub_opt_wrapper);
      } else if (opt.option_format == "multi-ip") {
        let button_div = document.createElement("div");
        button_div.classList.add("cd-textfield-wrapper");

        opt_input = document.createElement("div");
        opt_input.id = opt.option_name;
        opt_input.value = opt.default_value;
        opt_input.classList.add("cd-div-button-positive", "fa", "fa-plus");
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_input.setAttribute("field", opt.option_name);

        let default_sub_opt_wrapper = document.createElement("div");
        default_sub_opt_wrapper.classList.add("cd-textfield-wrapper");

        let default_ip_field = document.createElement("input");
        default_ip_field.classList.add("ct-input", "cd-field");
        default_ip_field.type = "text";
        default_ip_field.style.width = "90%";
        default_ip_field.setAttribute("opt-parent", opt_input.id);
        default_ip_field.id =
          opt_input.id + "-entry-" + btoa(String(Math.random()));
        default_ip_field.value =
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.option_name) &&
          groups_json[role][opt.option_name].length > 0
            ? groups_json[role][opt.option_name][0]
            : "";

        let default_feedback = document.createElement("div");
        default_feedback.classList.add("cd-field-feedback");
        default_feedback.id = default_ip_field.id + "-feedback";
        default_ip_field.addEventListener("input", function () {
          check_ip_field(
            default_ip_field.id,
            default_feedback.id,
            "global-options-btn",
            opt.option_name,
            true
          );
        });

        default_sub_opt_wrapper.appendChild(default_ip_field);
        default_sub_opt_wrapper.appendChild(opt_input);
        opt_wrapper.appendChild(default_sub_opt_wrapper);
        opt_wrapper.appendChild(default_feedback);

        if (
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.option_name) &&
          groups_json[role][opt.option_name].length > 1
        ) {
          for (let i = 1; i < groups_json[role][opt.option_name].length; i++) {
            let sub_opt_wrapper = document.createElement("div");
            sub_opt_wrapper.classList.add("cd-textfield-wrapper");

            let new_ip_field = document.createElement("input");
            new_ip_field.classList.add("ct-input", "cd-field");
            new_ip_field.type = "text";
            new_ip_field.style.width = "90%";
            new_ip_field.setAttribute("opt-parent", opt_input.id);
            new_ip_field.id =
              opt_input.id + "-entry-" + btoa(String(Math.random()));
            new_ip_field.value = groups_json[role][opt.option_name][i];

            let del_field_btn = document.createElement("div");
            del_field_btn.classList.add(
              "cd-host-list-entry-icon-del",
              "fa",
              "fa-times"
            );

            let feedback = document.createElement("div");
            feedback.classList.add("cd-field-feedback");
            feedback.id = new_ip_field.id + "-feedback";
            new_ip_field.addEventListener("input", function () {
              check_ip_field(
                new_ip_field.id,
                feedback.id,
                "global-options-btn",
                opt.option_name,
                true
              );
            });

            del_field_btn.addEventListener("click", () => {
              sub_opt_wrapper.remove();
              feedback.remove();
              document
                .getElementById("global-options-btn")
                .removeAttribute("disabled");
            });

            sub_opt_wrapper.appendChild(new_ip_field);
            sub_opt_wrapper.appendChild(del_field_btn);
            opt_wrapper.appendChild(sub_opt_wrapper);
            opt_wrapper.appendChild(feedback);
          }
        }

        opt_input.addEventListener("click", () => {
          let sub_opt_wrapper = document.createElement("div");
          sub_opt_wrapper.classList.add("cd-textfield-wrapper");

          let new_ip_field = document.createElement("input");
          new_ip_field.classList.add("ct-input", "cd-field");
          new_ip_field.type = "text";
          new_ip_field.style.width = "90%";
          new_ip_field.setAttribute("opt-parent", opt_input.id);
          new_ip_field.id =
            opt_input.id + "-entry-" + btoa(String(Math.random()));

          let del_field_btn = document.createElement("div");
          del_field_btn.classList.add(
            "cd-host-list-entry-icon-del",
            "fa",
            "fa-times"
          );

          let feedback = document.createElement("div");
          feedback.classList.add("cd-field-feedback");
          feedback.id = new_ip_field.id + "-feedback";
          new_ip_field.addEventListener("input", function () {
            check_ip_field(
              new_ip_field.id,
              feedback.id,
              "global-options-btn",
              opt.option_name,
              true
            );
          });

          del_field_btn.addEventListener("click", () => {
            sub_opt_wrapper.remove();
            feedback.remove();
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });

          sub_opt_wrapper.appendChild(new_ip_field);
          sub_opt_wrapper.appendChild(del_field_btn);
          opt_wrapper.appendChild(sub_opt_wrapper);
          opt_wrapper.appendChild(feedback);
        });
      } else {
        //default case
        if (opt.input_type === "text") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field");
          opt_input.value =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name) &&
            groups_json[role][opt.option_name] != ""
              ? groups_json[role][opt.option_name]
              : opt.default_value;
        } else if (opt.input_type === "checkbox") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field-checkbox");
          opt_input.checked =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name)
              ? groups_json[role][opt.option_name]
              : opt.default_value;
          opt_input.addEventListener("change", function () {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });
        }
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
        if (opt.feedback) {
          let feedback = generate_option_feedback(
            opt,
            opt_input,
            opt.option_name + "-feedback"
          );
          opt_wrapper.appendChild(feedback);
        }
      }
    }

    target_form.appendChild(opt_label);
    target_form.appendChild(opt_wrapper);
  }
}

function generate_option_feedback(opt, opt_input, id) {
  let feedback = document.createElement("div");
  feedback.classList.add("cd-field-feedback");
  feedback.id = id;

  if (opt.feedback_type === "ip") {
    opt_input.addEventListener("input", function () {
      check_ip_field(
        opt_input.id,
        feedback.id,
        "global-options-btn",
        opt.option_name,
        !opt.optional
      );
    });
  } else if (opt.feedback_type === "name") {
    opt_input.addEventListener("input", function () {
      check_name_field(
        opt_input.id,
        feedback.id,
        "global-options-btn",
        opt.option_name,
        !opt.optional
      );
    });
  } else if (opt.feedback_type === "num") {
    opt_input.addEventListener("input", function () {
      check_num_field(
        opt_input.id,
        feedback.id,
        "global-options-btn",
        opt.option_name,
        !opt.optional
      );
    });
  } else if (opt.feedback_type === "num_unlim") {
    opt_input.addEventListener("input", function () {
      check_num_unlim_field(
        opt_input.id,
        feedback.id,
        "global-options-btn",
        opt.option_name,
        !opt.optional
      );
    });
  } else if (opt.feedback_type === "choice") {
    opt_input.addEventListener("input", function () {
      check_choice_field(
        opt_input.id,
        feedback.id,
        "global-options-btn",
        opt.option_name,
        !opt.optional,
        opt.feedback_choice_options
      );
    });
  } else if (opt.feedback_type === "fixed") {
    opt_input.setAttribute("disabled", true);
    opt_input.classList.remove("cd-field");
    opt_input.classList.add("cd-field-disabled");
  }
  return feedback;
}

function make_radio_options(radio_form, parent_radio, role, groups_json) {
  for (let opt of parent_radio.radio_sub_options) {
    let opt_wrapper = document.createElement("div");
    opt_wrapper.classList.add("ct-validation-wrapper");

    let opt_label = document.createElement("label");
    opt_label.classList.add("control-label");
    opt_label.setAttribute("for", opt.option_name);
    opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;

    let opt_input = document.createElement("input");
    opt_input.setAttribute("opt-parent", parent_radio.radio_id);
    if (opt.option_format) {
      if (opt.option_format == "multi-checkbox") {
        //TODO: implement if needed in future
        console.error(
          "make_radio_options(): ",
          opt.option_format,
          " not implemented."
        );
      } else if (opt.option_format == "multi-ip") {
        //TODO: implement if needed in future
        console.error(
          "make_radio_options(): ",
          opt.option_format,
          " not implemented."
        );
      } else if (opt.option_format == "multi-object") {
        let button_div = document.createElement("div");
        button_div.classList.add("cd-textfield-wrapper");

        opt_input = document.createElement("div");
        opt_input.setAttribute("opt-parent", parent_radio.radio_id);
        opt_input.id = opt.option_name;
        opt_input.value = opt.default_value;
        opt_input.classList.add(
          "cd-div-button-positive",
          "fa",
          "fa-plus",
          "cd-icon-right"
        );
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_input.setAttribute("field", opt.radio_option_name);

        let obj_wrapper = document.createElement("div");
        obj_wrapper.classList.add("ct-form", "cd-sub-option");

        opt_wrapper.classList.remove("ct-validation-wrapper");
        opt_wrapper.classList.add("ct-form");

        if (
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.radio_option_name) &&
          groups_json[role][opt.radio_option_name].length > 0
        ) {
          //we have fields to populate
          for (
            let i = 0;
            i < groups_json[role][opt.radio_option_name].length;
            i++
          ) {
            let loaded_obj_field_wrapper = generate_object_fields(
              opt,
              opt_input,
              groups_json[role][opt.radio_option_name][i],
              i != 0
            );
            opt_wrapper.appendChild(loaded_obj_field_wrapper);
          }
          opt_wrapper.appendChild(opt_input);
        } else {
          //we have an empty array of objects, use defaults
          let def_object_field_wrapper = generate_object_fields(opt, opt_input);
          opt_wrapper.appendChild(def_object_field_wrapper);
          opt_wrapper.appendChild(opt_input);
        }

        opt_input.addEventListener("click", () => {
          let object_field_wrapper = generate_object_fields(
            opt,
            opt_input,
            {},
            true
          );
          opt_wrapper.insertBefore(object_field_wrapper, opt_input);
        });
      } else if (opt.option_format == "sub_form") {
        opt_wrapper.classList.remove("ct-validation-wrapper");
        opt_wrapper.classList.add("ct-form", "cd-sub-option");
        opt_input.type = "hidden";
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.radio_option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
        for (let sub_opt of opt.sub_form_options) {
          let sub_opt_wrapper = document.createElement("div");
          sub_opt_wrapper.classList.add("ct-validation-wrapper");

          let sub_opt_label = document.createElement("label");
          sub_opt_label.classList.add("control-label");
          sub_opt_label.setAttribute("for", sub_opt.option_name);
          sub_opt_label.innerText =
            (sub_opt.optional ? "" : "* ") + sub_opt.label;

          let sub_opt_input = document.createElement("input");
          sub_opt_input.setAttribute("opt-parent", opt.option_name);
          sub_opt_input.setAttribute("group-option", true);
          if (sub_opt.option_format) {
            if (sub_opt.option_format == "default") {
              if (
                sub_opt.input_type === "text" ||
                sub_opt.input_type === "password"
              ) {
                sub_opt_input.type = sub_opt.input_type;
                sub_opt_input.classList.add("ct-input", "cd-field");
                sub_opt_input.value =
                  groups_json.hasOwnProperty(role) &&
                  groups_json[role].hasOwnProperty(opt.option_name) &&
                  groups_json[role][opt.option_name].hasOwnProperty(
                    sub_opt.option_name
                  ) &&
                  groups_json[role][opt.option_name][sub_opt.option_name] != ""
                    ? groups_json[role][opt.option_name][sub_opt.option_name]
                    : sub_opt.default_value;
              } else if (sub_opt.input_type === "checkbox") {
                sub_opt_input.type = opt.input_type;
                sub_opt_input.classList.add("ct-input", "cd-field-checkbox");
                sub_opt_input.checked =
                  groups_json.hasOwnProperty(role) &&
                  groups_json[role].hasOwnProperty(opt.option_name) &&
                  groups_json[role][opt.option_name].hasOwnProperty(
                    sub_opt.option_name
                  )
                    ? groups_json[role][opt.option_name][sub_opt.option_name]
                    : sub_opt.default_value;
                sub_opt_input.addEventListener("change", function () {
                  document
                    .getElementById("global-options-btn")
                    .removeAttribute("disabled");
                });
              }
              sub_opt_input.setAttribute("aria-invalid", "false");
              sub_opt_input.id = sub_opt.option_name;
              sub_opt_input.setAttribute("group", role);
              sub_opt_input.setAttribute("field", sub_opt.option_name);
              sub_opt_input.setAttribute("optional", sub_opt.optional);
              sub_opt_input.setAttribute("group-option", true);
              sub_opt_input.setAttribute(
                "option_format",
                sub_opt.option_format
              );
              sub_opt_wrapper.appendChild(sub_opt_input);
              if (sub_opt.feedback) {
                let feedback = generate_option_feedback(
                  sub_opt,
                  sub_opt_input,
                  sub_opt.option_name + "-feedback"
                );
                sub_opt_wrapper.appendChild(feedback);
              }
              opt_wrapper.appendChild(sub_opt_label);
              opt_wrapper.appendChild(sub_opt_wrapper);
            }
          }
        }
      } else if (opt.option_format == "fixed-checkbox") {
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.checked = opt.default_value;
        opt_input.disabled = true;
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.radio_option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
      } else if (opt.option_format == "default") {
        if (opt.input_type === "text") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field");
          opt_input.value =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name) &&
            groups_json[role][opt.option_name] != ""
              ? groups_json[role][opt.option_name]
              : opt.default_value;
        } else if (opt.input_type === "checkbox") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field-checkbox");
          opt_input.checked =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name)
              ? groups_json[role][opt.option_name]
              : opt.default_value;
          opt_input.addEventListener("change", function () {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });
        }
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.radio_option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
        if (opt.feedback) {
          let feedback = generate_option_feedback(
            opt,
            opt_input,
            opt.option_name + "-feedback"
          );
          opt_wrapper.appendChild(feedback);
        }
      }
    }
    radio_form.appendChild(opt_label);
    radio_form.appendChild(opt_wrapper);
  }
}

function generate_object_fields(
  opt,
  opt_input,
  seed_object = {},
  make_del_button = false
) {
  let sub_opt_wrapper = document.createElement("div");
  sub_opt_wrapper.classList.add("ct-form", "cd-sub-option");

  let feedback_ids = [];
  let del_field_btn = document.createElement("div");
  del_field_btn.classList.add(
    "cd-host-list-entry-icon-del",
    "fa",
    "fa-times",
    "cd-icon-right"
  );
  if (make_del_button) {
    sub_opt_wrapper.appendChild(del_field_btn);
  }

  let new_obj_id = btoa(String(Math.random()));

  for (let obj_field of opt.multi_object_options) {
    let field_div = document.createElement("div");
    let field_label = document.createElement("label");
    field_label.classList.add("control-label");
    field_label.setAttribute("for", obj_field.option_name);
    field_label.innerText = (obj_field.optional ? "" : "* ") + obj_field.label;
    sub_opt_wrapper.appendChild(field_label);
    field_div.classList.add("ct-validation-wrapper");
    let field_input = document.createElement("input");
    if (obj_field.option_format == "default") {
      if (obj_field.input_type == "text") {
        field_input.classList.add("ct-input", "cd-field");
        field_input.type = obj_field.input_type;
        field_input.setAttribute("opt-parent", opt_input.id);
        field_input.id =
          opt.option_name + "-entry-" + btoa(String(Math.random()));
        field_input.setAttribute("obj-id", new_obj_id);
        field_input.setAttribute("field", obj_field.option_name);
        if (
          seed_object.hasOwnProperty(obj_field.option_name) &&
          seed_object[obj_field.option_name] != ""
        ) {
          field_input.value = seed_object[obj_field.option_name];
        } else {
          field_input.value = obj_field.default_value;
        }
        field_div.appendChild(field_input);
        if (obj_field.feedback) {
          let feedback = generate_option_feedback(
            obj_field,
            field_input,
            field_input.id + "-feedback"
          );
          feedback_ids.push(feedback.id);
          field_div.appendChild(feedback);
        }
      }
    }
    sub_opt_wrapper.appendChild(field_div);
  }
  if (make_del_button) {
    del_field_btn.addEventListener("click", () => {
      sub_opt_wrapper.remove();
      for (let fid of feedback_ids) {
        let fdbck = document.getElementById(fid);
        if (fdbck) {
          fdbck.remove();
        }
      }
    });
  }
  return sub_opt_wrapper;
}

function make_per_host_toggle_options(
  target_form,
  parent_opt,
  role,
  hosts_json,
  roles_json
) {
  let host_list = roles_json[role];
  for (let i = 0; i < host_list.length; i++) {
    let host_option_div = document.createElement("div");
    host_option_div.classList.add("panel", "panel-default", "cd-option-panel");

    let host_option_panel_heading = document.createElement("div");
    host_option_panel_heading.classList.add("cd-row", "cd-panel-heading");
    host_option_panel_heading.innerText = host_list[i];

    let host_option_panel_body = document.createElement("div");
    host_option_panel_body.classList.add("cd-panel-body");

    let host_form = document.createElement("div");
    host_form.classList.add("ct-form");
    for (let opt of parent_opt.toggle_options) {
      let opt_wrapper = document.createElement("div");
      opt_wrapper.classList.add("ct-validation-wrapper");

      let opt_label = document.createElement("label");
      opt_label.classList.add("control-label");
      opt_label.setAttribute("for", opt.option_name);
      opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;

      let opt_input = document.createElement("input");
      //opt_input.setAttribute("opt-parent", parent_opt.option_name);
      if (opt.option_format) {
        if (opt.option_format == "multi-device-path") {
          let button_div = document.createElement("div");
          button_div.classList.add("cd-textfield-wrapper");

          opt_input = document.createElement("div");
          opt_input.id = opt.option_name + "-" + host_list[i];
          opt_input.value = opt.default_value;
          opt_input.classList.add("cd-div-button-positive", "fa", "fa-plus");
          opt_input.setAttribute("host-option", true);
          opt_input.setAttribute("group", role);
          opt_input.setAttribute("option_format", opt.option_format);
          opt_input.setAttribute("field", opt.option_name);
          opt_input.setAttribute("hostname", host_list[i]);
          opt_input.setAttribute("opt-parent", parent_opt.option_name);
          opt_input.setAttribute("toggle-div", target_form.id);

          let default_sub_opt_wrapper = document.createElement("div");
          default_sub_opt_wrapper.classList.add("cd-textfield-wrapper");

          let default_path_field = document.createElement("input");
          default_path_field.classList.add("ct-input", "cd-field");
          default_path_field.type = "text";
          default_path_field.setAttribute("opt-parent", opt_input.id);
          default_path_field.setAttribute("hostname", host_list[i]);
          default_path_field.id =
            opt_input.id + "-entry-" + btoa(String(Math.random()));
          default_path_field.value =
            hosts_json.hasOwnProperty(host_list[i]) &&
            hosts_json[host_list[i]].hasOwnProperty(opt.option_name) &&
            hosts_json[host_list[i]][opt.option_name].length > 0
              ? hosts_json[host_list[i]][opt.option_name][0]
              : opt.default_path;

          let default_feedback = document.createElement("div");
          default_feedback.classList.add("cd-field-feedback");
          default_feedback.id = default_path_field.id + "-feedback";
          default_path_field.addEventListener("input", function () {
            check_device_path_field(
              default_path_field.id,
              default_feedback.id,
              "global-options-btn",
              opt.option_name,
              true
            );
          });

          default_sub_opt_wrapper.appendChild(default_path_field);
          default_sub_opt_wrapper.appendChild(opt_input);
          opt_wrapper.appendChild(default_sub_opt_wrapper);
          opt_wrapper.appendChild(default_feedback);
          if (
            hosts_json.hasOwnProperty(host_list[i]) &&
            hosts_json[host_list[i]].hasOwnProperty(opt.option_name) &&
            hosts_json[host_list[i]][opt.option_name].length > 1
          ) {
            for (
              let j = 1;
              j < hosts_json[host_list[i]][opt.option_name].length;
              j++
            ) {
              let sub_opt_wrapper = document.createElement("div");
              sub_opt_wrapper.classList.add("cd-textfield-wrapper");

              let new_path_field = document.createElement("input");
              new_path_field.classList.add("ct-input", "cd-field");
              new_path_field.type = "text";
              new_path_field.setAttribute("opt-parent", opt_input.id);
              new_path_field.setAttribute("hostname", host_list[i]);

              new_path_field.id =
                opt_input.id + "-entry-" + btoa(String(Math.random()));
              new_path_field.value =
                hosts_json[host_list[i]][opt.option_name][j];

              let del_field_btn = document.createElement("div");
              del_field_btn.classList.add(
                "cd-host-list-entry-icon-del",
                "fa",
                "fa-times"
              );

              let feedback = document.createElement("div");
              feedback.classList.add("cd-field-feedback");
              feedback.id = new_path_field.id + "-feedback";
              new_path_field.addEventListener("input", function () {
                check_device_path_field(
                  new_path_field.id,
                  feedback.id,
                  "global-options-btn",
                  opt.option_name + "-" + host_list[i],
                  true
                );
              });

              del_field_btn.addEventListener("click", () => {
                sub_opt_wrapper.remove();
                feedback.remove();
                document
                  .getElementById("global-options-btn")
                  .removeAttribute("disabled");
              });

              sub_opt_wrapper.appendChild(new_path_field);
              sub_opt_wrapper.appendChild(del_field_btn);
              opt_wrapper.appendChild(sub_opt_wrapper);
              opt_wrapper.appendChild(feedback);
            }
          }

          opt_input.addEventListener("click", () => {
            let sub_opt_wrapper = document.createElement("div");
            sub_opt_wrapper.classList.add("cd-textfield-wrapper");

            let new_path_field = document.createElement("input");
            new_path_field.classList.add("ct-input", "cd-field");
            new_path_field.type = "text";
            new_path_field.setAttribute("opt-parent", opt_input.id);
            new_path_field.setAttribute("hostname", host_list[i]);

            new_path_field.id =
              opt_input.id + "-entry-" + btoa(String(Math.random()));
            new_path_field.value = opt.default_path;

            let del_field_btn = document.createElement("div");
            del_field_btn.classList.add(
              "cd-host-list-entry-icon-del",
              "fa",
              "fa-times"
            );

            let feedback = document.createElement("div");
            feedback.classList.add("cd-field-feedback");
            feedback.id = new_path_field.id + "-feedback";
            new_path_field.addEventListener("input", function () {
              check_device_path_field(
                new_path_field.id,
                feedback.id,
                "global-options-btn",
                opt.option_name + "-" + host_list[i],
                true
              );
            });

            del_field_btn.addEventListener("click", () => {
              sub_opt_wrapper.remove();
              feedback.remove();
              document
                .getElementById("global-options-btn")
                .removeAttribute("disabled");
            });

            sub_opt_wrapper.appendChild(new_path_field);
            sub_opt_wrapper.appendChild(del_field_btn);
            opt_wrapper.appendChild(sub_opt_wrapper);
            opt_wrapper.appendChild(feedback);
          });
        }
        host_form.appendChild(opt_label);
        host_form.appendChild(opt_wrapper);
        host_option_panel_body.appendChild(host_form);
        host_option_div.appendChild(host_option_panel_heading);
        host_option_div.appendChild(host_option_panel_body);
        target_form.appendChild(host_option_div);
      }
    }
  }
}

function make_global_toggle_options(
  target_form,
  parent_opt,
  role,
  options_json
) {
  for (let opt of parent_opt.toggle_options) {
    let opt_wrapper = document.createElement("div");
    opt_wrapper.classList.add("ct-validation-wrapper");

    let opt_label = document.createElement("label");
    opt_label.classList.add("control-label");
    opt_label.setAttribute("for", opt.option_name);
    opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;

    let opt_input = document.createElement("input");
    opt_input.setAttribute("opt-parent", parent_opt.option_name);
    if (opt.option_format) {
      if (opt.option_format == "default") {
        if (opt.input_type === "text") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field");
          opt_input.value =
            options_json.hasOwnProperty(opt.option_name) &&
            options_json[opt.option_name] != ""
              ? options_json[opt.option_name]
              : opt.default_value;
          opt_input.setAttribute("default_value", opt.default_value);
        } else if (opt.input_type === "checkbox") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field-checkbox");
          opt_input.checked = options_json.hasOwnProperty(opt.option_name)
            ? options_json[opt.option_name]
            : opt.default_value;
          opt_input.setAttribute("default_value", opt.default_value);
          opt_input.addEventListener("change", function () {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });
        }
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
        if (opt.feedback) {
          let feedback = generate_option_feedback(
            opt,
            opt_input,
            opt.option_name + "-feedback"
          );
          opt_wrapper.appendChild(feedback);
        }
      }
    }
    target_form.appendChild(opt_label);
    target_form.appendChild(opt_wrapper);
  }
}

function make_toggle_options(target_form, parent_opt, role, groups_json) {
  for (let opt of parent_opt.toggle_options) {
    let opt_wrapper = document.createElement("div");
    opt_wrapper.classList.add("ct-validation-wrapper");

    let opt_label = document.createElement("label");
    opt_label.classList.add("control-label");
    opt_label.setAttribute("for", opt.option_name);
    opt_label.innerText = (opt.optional ? "" : "* ") + opt.label;

    let opt_input = document.createElement("input");
    opt_input.setAttribute("opt-parent", parent_opt.option_name);
    if (opt.option_format) {
      if (opt.option_format == "multi-checkbox") {
        opt_input.type = opt.input_type;
        opt_input.classList.add("ct-input", "cd-field-checkbox");
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_input.setAttribute("field", opt.option_name);
        if (
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(parent_opt.option_name) &&
          !groups_json[role][parent_opt.option_name]
        ) {
          opt_input.checked = opt.default_value;
        } else if (
          groups_json.hasOwnProperty(role) &&
          groups_json[role].hasOwnProperty(opt.option_name)
        ) {
          opt_input.checked =
            groups_json[role][opt.option_name].length > 0 ? true : false;
        } else {
          opt_input.checked = opt.default_value;
        }
        opt_input.addEventListener("change", () => {
          let sub_opt_div = opt_wrapper.querySelector(
            `:scope [opt-parent="${opt_input.id}"]`
          );
          let update_btn = document.getElementById("global-options-btn");
          if (!sub_opt_div || !update_btn) return;
          if (opt_input.checked) {
            sub_opt_div.classList.remove("hidden");
          } else {
            sub_opt_div.classList.add("hidden");
          }
          update_btn.removeAttribute("disabled");
        });

        let opt_enable_wrapper = document.createElement("div");
        opt_enable_wrapper.classList.add("cd-checkbox-wrapper");
        opt_enable_wrapper.appendChild(opt_input);
        opt_enable_wrapper.style.marginTop = "10px";

        let enable_switch = document.createElement("label");
        enable_switch.classList.add("cd-switch");
        let slider = document.createElement("span");
        slider.classList.add("cd-slider", "round");

        let sub_opt_wrapper = document.createElement("div");
        sub_opt_wrapper.setAttribute("opt-parent", opt.option_name);
        if (opt_input.checked) {
          sub_opt_wrapper.classList.remove("hidden");
        } else {
          sub_opt_wrapper.classList.add("hidden");
        }

        enable_switch.appendChild(opt_input);
        enable_switch.appendChild(slider);
        opt_enable_wrapper.appendChild(enable_switch);
        opt_wrapper.appendChild(opt_enable_wrapper);

        for (let sub_opt of opt.multi_checkbox_entries) {
          let wrapper = document.createElement("div");
          wrapper.classList.add("cd-checkbox-wrapper");

          let box_div = document.createElement("div");
          box_div.classList.add("cd-checkbox-wrapper");

          let box_label = document.createElement("label");
          box_label.classList.add("control-label");
          box_label.setAttribute("for", sub_opt.label);
          box_label.innerText = sub_opt.label;

          let box = document.createElement("input");
          box.type = "checkbox";
          box.classList.add("ct-input", "cd-field-checkbox");
          if (
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(parent_opt.option_name) &&
            !groups_json[role][parent_opt.option_name]
          ) {
            box.checked = sub_opt.default_value;
          } else if (
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name)
          ) {
            box.checked = groups_json[role][opt.option_name].find(
              (str) => str === sub_opt.label
            )
              ? true
              : false;
          } else {
            box.checked = sub_opt.default_value;
          }
          box.setAttribute("opt-parent", opt.option_name);
          box.setAttribute("field", sub_opt.label);
          box.addEventListener("change", () => {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });

          box_div.appendChild(box);
          wrapper.appendChild(box_div);
          wrapper.appendChild(box_label);
          sub_opt_wrapper.appendChild(wrapper);
        }
        opt_wrapper.appendChild(sub_opt_wrapper);
      } else if (opt.option_format == "multi-ip") {
        let button_div = document.createElement("div");
        button_div.classList.add("cd-textfield-wrapper");

        opt_input = document.createElement("div");
        opt_input.id = opt.option_name;
        opt_input.value = opt.default_value;
        opt_input.classList.add("cd-div-button-positive", "fa", "fa-plus");
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_input.setAttribute("field", opt.option_name);

        let default_sub_opt_wrapper = document.createElement("div");
        default_sub_opt_wrapper.classList.add("cd-textfield-wrapper");

        let default_ip_field = document.createElement("input");
        default_ip_field.classList.add("ct-input", "cd-field");
        default_ip_field.type = "text";
        default_ip_field.setAttribute("opt-parent", opt_input.id);
        default_ip_field.id =
          opt_input.id + "-entry-" + btoa(String(Math.random()));

        let default_feedback = document.createElement("div");
        default_feedback.classList.add("cd-field-feedback");
        default_feedback.id = default_ip_field.id + "-feedback";
        default_ip_field.addEventListener("input", function () {
          check_ip_field(
            default_ip_field.id,
            default_feedback.id,
            "global-options-btn",
            opt.option_name,
            true
          );
        });

        default_sub_opt_wrapper.appendChild(default_ip_field);
        default_sub_opt_wrapper.appendChild(opt_input);
        opt_wrapper.appendChild(default_sub_opt_wrapper);
        opt_wrapper.appendChild(default_feedback);

        opt_input.addEventListener("click", () => {
          let sub_opt_wrapper = document.createElement("div");
          sub_opt_wrapper.classList.add("cd-textfield-wrapper");

          let new_ip_field = document.createElement("input");
          new_ip_field.classList.add("ct-input", "cd-field");
          new_ip_field.type = "text";
          new_ip_field.setAttribute("opt-parent", opt_input.id);
          new_ip_field.id =
            opt_input.id + "-entry-" + btoa(String(Math.random()));

          let del_field_btn = document.createElement("div");
          del_field_btn.classList.add(
            "cd-host-list-entry-icon-del",
            "fa",
            "fa-times"
          );

          let feedback = document.createElement("div");
          feedback.classList.add("cd-field-feedback");
          feedback.id = new_ip_field.id + "-feedback";
          new_ip_field.addEventListener("input", function () {
            check_ip_field(
              new_ip_field.id,
              feedback.id,
              "global-options-btn",
              opt.option_name,
              true
            );
          });

          del_field_btn.addEventListener("click", () => {
            sub_opt_wrapper.remove();
            feedback.remove();
          });

          sub_opt_wrapper.appendChild(new_ip_field);
          sub_opt_wrapper.appendChild(del_field_btn);
          opt_wrapper.appendChild(sub_opt_wrapper);
          opt_wrapper.appendChild(feedback);
        });
      } else if (opt.option_format == "default") {
        if (opt.input_type === "text") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field");
          opt_input.value =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name) &&
            groups_json[role][opt.option_name] != ""
              ? groups_json[role][opt.option_name]
              : opt.default_value;
        } else if (opt.input_type === "checkbox") {
          opt_input.type = opt.input_type;
          opt_input.classList.add("ct-input", "cd-field-checkbox");
          opt_input.checked =
            groups_json.hasOwnProperty(role) &&
            groups_json[role].hasOwnProperty(opt.option_name)
              ? groups_json[role][opt.option_name]
              : opt.default_value;
          opt_input.addEventListener("change", function () {
            document
              .getElementById("global-options-btn")
              .removeAttribute("disabled");
          });
        }
        opt_input.setAttribute("aria-invalid", "false");
        opt_input.id = opt.option_name;
        opt_input.setAttribute("group", role);
        opt_input.setAttribute("field", opt.option_name);
        opt_input.setAttribute("optional", opt.optional);
        opt_input.setAttribute("group-option", true);
        opt_input.setAttribute("option_format", opt.option_format);
        opt_wrapper.appendChild(opt_input);
        if (opt.feedback) {
          let feedback = generate_option_feedback(
            opt,
            opt_input,
            opt.option_name + "-feedback"
          );
          opt_wrapper.appendChild(feedback);
        }
      }
    }

    target_form.appendChild(opt_label);
    target_form.appendChild(opt_wrapper);
  }
}

/**
 * uses the core_params helper script. The -s option provided will output json to
 * stdout. This will then update the hosts, roles and options using the current json.
 */
function get_param_file_content() {
  var spawn_args = [
    "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
    "-s",
  ];
  var result_json = null;
  var proc = cockpit.spawn(spawn_args, { superuser: "require" });
  proc.done(function (data) {
    var msg_label = "";
    var msg_content = "";
    var msg_color = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      if (result_json.hasOwnProperty("old_file_content")) {
        update_host_info(result_json.old_file_content.hosts);
        update_role_info(
          result_json.old_file_content.hosts,
          result_json.old_file_content.roles
        );
        update_options_info(
          result_json.old_file_content.hosts,
          result_json.old_file_content.roles,
          result_json.old_file_content.options,
          result_json.old_file_content.groups
        );
        if (result_json.old_file_content.hasOwnProperty("time_stamp")) {
          localStorage.setItem(
            "last_option_update_time",
            result_json.old_file_content["time_stamp"]
          );
          localStorage.setItem(
            "current_params",
            JSON.stringify(result_json.old_file_content)
          );
        }
      }
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
      show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
    }
    hide_modal_dialog("add-host-modal");
  });
  proc.fail(function (ex, data) {
    console.log(data);
    var msg_color = "#bd3030";
    var msg_label = "Error:";
    var msg_content = "Unable to load parameter file.";
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

/**
 * uses core_params helper script with the -x option to remove the host with
 * the hostname of the provided string from /usr/share/cockpit/ceph-deploy/params/core_params.json.
 * @param {string} hostname
 */
function remove_host(hostname) {
  host_request_json = { [hostname]: { hostname: {} } };
  host_request_json[hostname]["hostname"] = hostname;
  var spawn_args = [
    "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
    "-h",
    JSON.stringify(host_request_json),
    "-x",
  ];
  var result_json = null;
  var proc = cockpit.spawn(spawn_args, { superuser: "require" });
  proc.done(function (data) {
    var msg_label = "";
    var msg_content = "";
    var msg_color = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Remove Host: ";
      msg_content = result_json.success_msg;
      check_for_parameter_change(result_json);
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    get_param_file_content();
    show_snackbar_msg(msg_label, msg_content, msg_color, "add-host-snackbar");
  });
  proc.fail(function (ex, data) {
    var msg_label = "Error: ";
    var msg_content = "";
    var msg_color = "#bd3030";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_content = "Unable to remove host";
    }
    if (result_json.hasOwnProperty("error_msg")) {
      msg_content = result_json.error_msg;
    } else {
      msg_content = "Unable to remove host";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "add-host-snackbar");
  });
}

/**
 * updates the list of hosts using the json provided. if the host list is empty, progress
 * is forbidden by disabling the next button. It will also enable the button if
 * the list is not empty.
 * @param {Object} hosts_json
 */
function update_host_info(hosts_json) {
  let host_list = document.getElementById("cd-host-list");
  while (host_list.hasChildNodes()) {
    host_list.removeChild(host_list.firstChild);
  }
  if (Object.keys(hosts_json).length > 0) {
    document
      .getElementById("ansible-config-hosts-and-roles-nxt")
      .removeAttribute("disabled");
    document.getElementById("cd-host-box").classList.remove("hidden");
    document.getElementById("cd-host-placeholder").classList.add("hidden");
    for (let key of Object.keys(hosts_json)) {
      let hostname = hosts_json[key]["hostname"];

      var new_host_entry = document.createElement("div");
      new_host_entry.classList.add("cd-host-list-entry");

      var host_entry_hostname = document.createElement("div");
      host_entry_hostname.classList.add("cd-host-list-entry-text");
      host_entry_hostname.innerText = hostname;

      var host_entry_delete_icon = document.createElement("div");
      host_entry_delete_icon.classList.add(
        "cd-host-list-entry-icon-del",
        "fa",
        "fa-times"
      );
      host_entry_delete_icon.addEventListener("click", function () {
        let arg = hostname.valueOf();
        remove_host(arg);
      });

      new_host_entry.appendChild(host_entry_hostname);
      new_host_entry.appendChild(host_entry_delete_icon);

      host_list.appendChild(new_host_entry);
    }
  } else {
    document.getElementById("cd-host-box").classList.add("hidden");
    document.getElementById("cd-host-placeholder").classList.remove("hidden");
    document.getElementById(
      "ansible-config-hosts-and-roles-nxt"
    ).disabled = true;
  }
}

/**
 * using the state of the checkboxes, use the core_params helper script
 * to update /usr/share/cockpit/ceph-deploy/params/core_params.json
 */
function update_role_request() {
  // we can update the roles assigned to each host by performing two subsequent requests.
  // we can remove any unchecked roles first, then we can add in all of the checked roles.

  let role_request_template = {
    mons: [],
    mgrs: [],
    osds: [],
    metrics: [],
    mdss: [],
    smbs: [],
    nfss: [],
    iscsigws: [],
    rgws: [],
    rgwloadbalancers: [],
    client: [],
  };

  let add_role_request_json = {
    mons: [],
    mgrs: [],
    osds: [],
    metrics: [],
    mdss: [],
    smbs: [],
    nfss: [],
    iscsigws: [],
    rgws: [],
    rgwloadbalancers: [],
    client: [],
  };

  let remove_role_request_json = {
    mons: [],
    mgrs: [],
    osds: [],
    metrics: [],
    mdss: [],
    smbs: [],
    nfss: [],
    iscsigws: [],
    rgws: [],
    rgwloadbalancers: [],
    client: [],
  };

  //look through the role table and determine the state of each checkbox.
  let role_table_host_rows = document.getElementsByClassName(
    "role-table-host-row"
  );
  for (let i = 0; i < role_table_host_rows.length; i++) {
    // get the hostname from the id string of the tr element.
    let hostname = role_table_host_rows[i].id.substring(
      "role-table-host-row-".length
    );
    for (let role_key of Object.keys(role_request_template)) {
      //construct the id string of the checkbox: example "mons-hostname1-checkbox"
      let checkbox_id_string = role_key + "-" + hostname + "-checkbox";
      let role_checkbox = document.getElementById(checkbox_id_string);
      if (role_checkbox != null) {
        if (role_checkbox.checked) {
          // The checkbox is checked, add the hostname to the add_role_request
          add_role_request_json[role_key].push(hostname);
        } else {
          // The checkbox is not checked, add the hostname to the remove_role_request
          remove_role_request_json[role_key].push(hostname);
        }
      }
    }
  }

  // perform the remove request first
  var remove_spawn_args = [
    "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
    "-r",
    JSON.stringify(remove_role_request_json),
    "-x",
  ];
  var remove_result_json = null;
  var remove_role_proc = cockpit.spawn(remove_spawn_args, {
    superuser: "require",
  });
  remove_role_proc.done(function (data) {
    // removal was successful, now perform the add role request.
    remove_result_json = JSON.parse(data);
    var add_spawn_args = [
      "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
      "-r",
      JSON.stringify(add_role_request_json),
      "-w",
    ];
    var add_result_json = null;
    var add_role_proc = cockpit.spawn(add_spawn_args, { superuser: "require" });
    add_role_proc.done(function (data) {
      add_result_json = JSON.parse(data);
      if (
        JSON.stringify(remove_result_json["old_file_content"]) !=
        JSON.stringify(add_result_json["new_file_content"])
      ) {
        add_result_json["old_file_content"] =
          remove_result_json["old_file_content"];
        check_for_parameter_change(add_result_json);
      }
      show_snackbar_msg(
        "Message: ",
        "Roles have been updated.",
        "#20a030",
        "update-roles-snackbar"
      );
      get_param_file_content();
    });
    add_role_proc.fail(function (ex, data) {
      console.log("add_role_proc (FAIL): ", data);
      show_snackbar_msg(
        "Error: ",
        "Failed to add role(s)",
        "#bd3030",
        "update-roles-snackbar"
      );
    });
  });
  remove_role_proc.fail(function (ex, data) {
    console.log("remove_role_proc (FAIL): ", data);
    show_snackbar_msg(
      "Error: ",
      "Failed to remove role(s)",
      "#bd3030",
      "update-roles-snackbar"
    );
  });
}

/**
 * use the core_params helper script to update the options in /usr/share/cockpit/ceph-deploy/params/core_params.json
 * using the content of the option field elements.
 */
function update_options_request() {
  // go through each role and get the values for the options_request_json and the
  // host_request json.
  let options_request_json = {};
  let options_div = document.getElementById("ansible-config-options");
  let ABORT = false;
  let ABORT_MSG = "Error";

  let global_list = [
    ...options_div.querySelectorAll(':scope input[global-option="true"]'),
  ];

  global_list.forEach((element) => {
    if (
      element.getAttribute("option_format") &&
      element.getAttribute("option_format") === "default"
    ) {
      if (element.type == "text") {
        options_request_json[element.id] = element.value;
        if (
          element.value == "" &&
          !element.getAttribute("optional") &&
          !element.getAttribute("opt-parent")
        ) {
          element.dispatchEvent(new Event("input"));
          ABORT = true;
          ABORT_MSG = "Fix invalid fields before proceeding";
        }
      } else if (element.type == "checkbox") {
        options_request_json[element.id] = element.checked ? true : false;
      }
    } else if (
      element.getAttribute("option_format") &&
      element.getAttribute("option_format") === "global-toggle"
    ) {
      if (element.type == "checkbox") {
        options_request_json[element.id] = element.checked ? true : false;
        let child_options = [
          ...options_div.querySelectorAll(`input[opt-parent=${element.id}]`),
        ];
        child_options.forEach((g_opt) => {
          if (g_opt.getAttribute("option_format") == "default") {
            if (g_opt.type == "text") {
              options_request_json[g_opt.id] = element.checked
                ? g_opt.value
                : g_opt.getAttribute("default_value");
              if (
                element.checked &&
                g_opt.value == "" &&
                g_opt.getAttribute("optional")
              ) {
                g_opt.dispatchEvent(new Event("input"));
                ABORT = true;
                ABORT_MSG = "Fix invalid fields before proceeding";
              }
            } else if (g_opt.type == "checkbox") {
              options_request_json[g_opt.id] = element.checked
                ? g_opt.checked
                : g_opt.getAttribute("default_value");
            }
          }
        });
      }
    } else if (
      element.getAttribute("option_format") &&
      element.getAttribute("option_format") === "per-host-toggle"
    ) {
      if (element.type == "checkbox") {
        options_request_json[element.id] = element.checked ? true : false;
      }
    }
  });

  let per_host_list = [
    ...options_div.querySelectorAll(':scope [host-option="true"]'),
  ];

  let host_request_json = {};

  per_host_list.forEach((element) => {
    if (!host_request_json.hasOwnProperty(element.getAttribute("hostname"))) {
      host_request_json[element.getAttribute("hostname")] = {
        hostname: element.getAttribute("hostname"),
      };
    }
    if (element.getAttribute("option_format") === "default") {
      if (element.type == "text") {
        host_request_json[element.getAttribute("hostname")][
          element.getAttribute("field")
        ] = element.value;
      } else if (element.type == "checkbox") {
        host_request_json[element.getAttribute("hostname")][
          element.getAttribute("field")
        ] = element.checked ? true : false;
      }
    } else if (element.getAttribute("option_format") === "multi-device-path") {
      let host_d_path_list = [
        ...options_div.querySelectorAll(`[opt-parent=${element.id}][hostname]`),
      ];
      if (host_d_path_list.length > 0) {
        host_request_json[element.getAttribute("hostname")][
          element.getAttribute("field")
        ] = [];
        host_d_path_list.forEach((dp_text) => {
          if (
            host_request_json[element.getAttribute("hostname")][
              element.getAttribute("field")
            ].indexOf(dp_text.value) == -1 &&
            element.hasAttribute("opt-parent") &&
            !document
              .getElementById(element.getAttribute("toggle-div"))
              .classList.contains("hidden") &&
            dp_text.value != "/dev/disk/by-vdev/"
          ) {
            host_request_json[element.getAttribute("hostname")][
              element.getAttribute("field")
            ].push(dp_text.value);
          } else if (
            !document
              .getElementById(element.getAttribute("toggle-div"))
              .classList.contains("hidden") &&
            (dp_text.value === "/dev/disk/by-vdev/" || dp_text.value === "")
          ) {
            dp_text.dispatchEvent(new Event("input"));
            ABORT = true;
            ABORT_MSG = "Fix device paths before proceeding.";
          }
        });
      }
    }
  });
  if (ABORT) {
    show_snackbar_msg(
      "Message: ",
      ABORT_MSG,
      "#bd3030",
      "update-options-snackbar"
    );
    return;
  }

  let group_request_json = {};
  let group_list = [...options_div.querySelectorAll('[group-option="true"]')];
  group_list.forEach((element) => {
    if (!element.getAttribute("opt-parent")) {
      // element is not a child option.
      if (!group_request_json.hasOwnProperty(element.getAttribute("group"))) {
        group_request_json[element.getAttribute("group")] = {};
      }

      if (element.getAttribute("option_format") == "default") {
        // simply use the textfield value or checkbox value as normal
        if (element.type == "text") {
          group_request_json[element.getAttribute("group")][
            element.getAttribute("field")
          ] = element.value;
        } else if (element.type == "checkbox") {
          group_request_json[element.getAttribute("group")][
            element.getAttribute("field")
          ] = element.checked ? true : false;
        }
      } else if (element.getAttribute("option_format") == "toggle_parent") {
        if (element.type == "checkbox" && element.checked) {
          let toggle_opt_list = [
            ...options_div.querySelectorAll(
              `[opt-parent=${element.id}][group-option="true"]`
            ),
          ];
          group_request_json[element.getAttribute("group")][
            element.getAttribute("field")
          ] = true;
          toggle_opt_list.forEach((sub_opt) => {
            if (sub_opt.getAttribute("option_format") == "default") {
              if (sub_opt.type == "text") {
                group_request_json[sub_opt.getAttribute("group")][
                  sub_opt.getAttribute("field")
                ] = sub_opt.value;
              } else if (sub_opt.type == "checkbox") {
                group_request_json[sub_opt.getAttribute("group")][
                  sub_opt.getAttribute("field")
                ] = sub_opt.checked ? true : false;
              }
            } else if (sub_opt.getAttribute("option_format") == "multi-ip") {
              let sub_opt_multi_ip_list = [
                ...options_div.querySelectorAll(
                  `[opt-parent=${sub_opt.id}][type="text"]`
                ),
              ];
              sub_opt_multi_ip_list.forEach((ip_addr) => {
                group_request_json[element.getAttribute("group")][
                  element.getAttribute("field")
                ].push(ip_addr.value);
              });
            } else if (
              sub_opt.getAttribute("option_format") == "multi-checkbox"
            ) {
              if (sub_opt.checked) {
                group_request_json[sub_opt.getAttribute("group")][
                  sub_opt.getAttribute("field")
                ] = [];
                let sub_opt_child_list = [
                  ...options_div.querySelectorAll(
                    `[opt-parent=${sub_opt.id}][type="checkbox"]`
                  ),
                ];
                sub_opt_child_list.forEach((sub_opt_child) => {
                  if (sub_opt_child.checked) {
                    group_request_json[sub_opt.getAttribute("group")][
                      sub_opt.getAttribute("field")
                    ].push(sub_opt_child.getAttribute("field"));
                  }
                });
              }
            }
          });
        }
      } else if (element.getAttribute("option_format") == "radio") {
        let radio_btn_list = [
          ...element.querySelectorAll(`:scope input[name=${element.id}]`),
        ];
        radio_btn_list.forEach((radio_btn) => {
          if (radio_btn.checked) {
            group_request_json[element.getAttribute("group")][
              radio_btn.id
            ] = true;
            let radio_sub_options = [
              ...options_div.querySelectorAll(
                `[opt-parent=${radio_btn.id}][group-option="true"]`
              ),
            ];
            radio_sub_options.forEach((radio_sub_opt) => {
              if (radio_sub_opt.getAttribute("option_format") == "default") {
                if (
                  radio_sub_opt.type == "text" ||
                  radio_sub_opt.type == "password"
                ) {
                  group_request_json[element.getAttribute("group")][
                    radio_sub_opt.getAttribute("field")
                  ] = radio_sub_opt.value;
                } else if (radio_sub_opt.type == "checkbox") {
                  group_request_json[element.getAttribute("group")][
                    radio_sub_opt.getAttribute("field")
                  ] = radio_sub_opt.checked;
                }
              } else if (
                radio_sub_opt.getAttribute("option_format") == "fixed-checkbox"
              ) {
                group_request_json[element.getAttribute("group")][
                  radio_sub_opt.getAttribute("field")
                ] = radio_sub_opt.checked;
              } else if (
                radio_sub_opt.getAttribute("option_format") == "sub_form"
              ) {
                // we need to look through all of its children.
                let sub_form_list = [
                  ...options_div.querySelectorAll(
                    `[opt-parent=${radio_sub_opt.id}]`
                  ),
                ];
                group_request_json[element.getAttribute("group")][
                  radio_sub_opt.getAttribute("field")
                ] = {};
                sub_form_list.forEach((sub_form_entry) => {
                  if (
                    sub_form_entry.getAttribute("option_format") == "default"
                  ) {
                    if (
                      sub_form_entry.type == "text" ||
                      sub_form_entry.type == "password"
                    ) {
                      group_request_json[element.getAttribute("group")][
                        radio_sub_opt.getAttribute("field")
                      ][sub_form_entry.getAttribute("field")] =
                        sub_form_entry.value;
                    }
                  }
                });
              } else if (
                radio_sub_opt.getAttribute("option_format") == "multi-object"
              ) {
                let multi_obj_list = [
                  ...options_div.querySelectorAll(
                    `[opt-parent="${radio_sub_opt.id}"]`
                  ),
                ];

                // create a blank array and blank object
                group_request_json[element.getAttribute("group")][
                  radio_sub_opt.getAttribute("field")
                ] = [];
                let multi_obj_tmp = {};

                multi_obj_list.forEach((field) => {
                  if (
                    !multi_obj_tmp.hasOwnProperty(field.getAttribute("obj-id"))
                  ) {
                    multi_obj_tmp[field.getAttribute("obj-id")] = {};
                  }
                  if (field.getAttribute("type") == "text") {
                    multi_obj_tmp[field.getAttribute("obj-id")][
                      field.getAttribute("field")
                    ] = field.value;
                  }
                });

                for ([key, value] of Object.entries(multi_obj_tmp)) {
                  group_request_json[element.getAttribute("group")][
                    radio_sub_opt.getAttribute("field")
                  ].push(value);
                }
              }
            });
          } else {
            group_request_json[element.getAttribute("group")][
              radio_btn.id
            ] = false;
          }
        });
      } else if (element.getAttribute("option_format") == "multi-ip") {
        group_request_json[element.getAttribute("group")][
          element.getAttribute("field")
        ] = [];
        let multi_ip_list = [
          ...options_div.querySelectorAll(
            `[opt-parent="${element.id}"][type="text"]`
          ),
        ];
        multi_ip_list.forEach((ip_addr) => {
          group_request_json[element.getAttribute("group")][
            element.getAttribute("field")
          ].push(ip_addr.value);
        });
      } else if (element.getAttribute("option_format") == "multi-checkbox") {
        if (element.checked) {
          group_request_json[element.getAttribute("group")][
            element.getAttribute("field")
          ] = [];
          let multi_checkbox_child_list = [
            ...options_div.querySelectorAll(
              `[opt-parent="${element.id}"][type="checkbox"]`
            ),
          ];
          multi_checkbox_child_list.forEach((child) => {
            if (child.checked) {
              group_request_json[element.getAttribute("group")][
                element.getAttribute("field")
              ].push(child.getAttribute("field"));
            }
          });
        }
      } else {
        console.log(
          "unknown option_format: ",
          element.getAttribute("option_format")
        );
        console.error("element with unknwon option_format: ", element);
      }
    }
  });

  // update options, hosts, and group parameters (in that order).
  var options_spawn_args = [
    "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
    "-o",
    JSON.stringify(options_request_json),
    "-w",
  ];
  var options_proc = cockpit.spawn(options_spawn_args, {
    superuser: "require",
  });
  var options_result_json = null;
  options_proc.done(function (data) {
    try {
      options_result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (options_result_json) {
      check_for_parameter_change(options_result_json);
      get_param_file_content();
      setup_main_menu();
      if (
        options_result_json.hasOwnProperty("old_file_content") &&
        options_result_json.hasOwnProperty("new_file_content") &&
        JSON.stringify(options_result_json["new_file_content"]["options"]) !=
          JSON.stringify(options_result_json["old_file_content"]["options"])
      ) {
        get_param_file_content();
        show_snackbar_msg(
          "Message: ",
          "Global options have been updated",
          "#20a030",
          "update-options-snackbar"
        );
      }
    }

    // update the host params, and then update group options upon success.
    var host_spawn_args = [
      "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
      "-h",
      JSON.stringify(host_request_json),
      "-w",
    ];
    var host_result_json = null;
    var host_proc = cockpit.spawn(host_spawn_args, { superuser: "require" });
    host_proc.done(function (data) {
      var msg_label = "";
      var msg_content = "";
      var msg_color = "";
      try {
        host_result_json = JSON.parse(data);
      } catch (e) {
        msg_color = "#bd3030";
        msg_label = "Error:";
        msg_content = "Unexpected return value.";
      }
      if (host_result_json) {
        get_param_file_content();
        check_for_parameter_change(host_result_json);
        setup_main_menu();
      }
      if (host_result_json.hasOwnProperty("success_msg")) {
        msg_color = "#20a030";
        msg_label = "Per-host Option: ";
        msg_content = "Host information updated.";
      } else {
        msg_color = "#bd3030";
        msg_label = "Error:";
        msg_content = "Unexpected return value.";
      }
      hide_modal_dialog("add-host-modal");
      if (
        host_result_json.hasOwnProperty("new_file_content") &&
        host_result_json.hasOwnProperty("old_file_content") &&
        JSON.stringify(host_result_json["new_file_content"]) !=
          JSON.stringify(host_result_json["old_file_content"])
      ) {
        get_param_file_content();
        show_snackbar_msg(
          msg_label,
          msg_content,
          msg_color,
          "add-host-snackbar"
        );
      }
      if (JSON.stringify(group_request_json) != "{}") {
        //update group options if there are options to update
        var group_spawn_args = [
          "/usr/share/cockpit/ceph-deploy/helper_scripts/core_params",
          "-g",
          JSON.stringify(group_request_json),
          "-w",
        ];
        var group_proc = cockpit.spawn(group_spawn_args, {
          superuser: "require",
        });
        var group_result_json = null;
        group_proc.done(function (data) {
          var msg_label = "";
          var msg_content = "";
          var msg_color = "";
          try {
            group_result_json = JSON.parse(data);
          } catch (e) {
            msg_color = "#bd3030";
            msg_label = "Error:";
            msg_content = "Unexpected return value.";
          }
          if (group_result_json) {
            check_for_parameter_change(group_result_json);
            get_param_file_content();
            setup_main_menu();
          }
          if (group_result_json.hasOwnProperty("success_msg")) {
            msg_color = "#20a030";
            msg_label = "Group Settings: ";
            msg_content = "Group Settings Updated.";
          } else {
            msg_color = "#bd3030";
            msg_label = "Error:";
            msg_content = "Unexpected return value.";
          }
          if (
            group_result_json.hasOwnProperty("old_file_content") &&
            group_result_json.hasOwnProperty("new_file_content") &&
            JSON.stringify(group_result_json["new_file_content"]["groups"]) !=
              JSON.stringify(group_result_json["old_file_content"]["groups"])
          ) {
            get_param_file_content();
            show_snackbar_msg(
              msg_label,
              msg_content,
              msg_color,
              "general-snackbar"
            );
          }
          setup_main_menu();
        });
        group_proc.fail(function (ex, data) {
          console.log("group_proc (FAIL): ", data);
          show_snackbar_msg(
            "Error: ",
            "Failed to modify global options",
            "#bd3030",
            "update-roles-snackbar"
          );
          console.log("group_proc (FAIL): ", ex);
        });
      }
    });
    host_proc.fail(function (ex, data) {
      document.getElementById("add-host-result-msg").style.display = "block";
      var msg_label = document.getElementById("add-host-result-msg-label");
      msg_label.innerHTML = "Error:";
      var msg_content = document.getElementById("add-host-result-msg-content");
      try {
        host_result_json = JSON.parse(data);
      } catch (e) {
        msg_content.innerHTML = "Unable to add host";
      }
      if (host_result_json.hasOwnProperty("error_msg")) {
        msg_content.innerHTML = host_result_json.error_msg;
      } else {
        msg_content.innerHTML = "Unable to add host";
      }
    });
    //get_param_file_content();
    setup_main_menu();
  });
  options_proc.fail(function (ex, data) {
    console.log("options_proc (FAIL): ", data);
    show_snackbar_msg(
      "Error: ",
      "Failed to modify global options",
      "#bd3030",
      "update-roles-snackbar"
    );
  });
}

function check_for_parameter_change(param_json_msg) {
  if (
    !param_json_msg.hasOwnProperty("old_file_content") ||
    !param_json_msg.hasOwnProperty("new_file_content")
  ) {
    return;
  }
  let old_params = param_json_msg["old_file_content"];
  let new_params = param_json_msg["new_file_content"];

  // see if host parameters were modified
  if (
    old_params.hasOwnProperty("hosts") &&
    new_params.hasOwnProperty("hosts")
  ) {
    if (
      JSON.stringify(old_params["hosts"]) != JSON.stringify(new_params["hosts"])
    ) {
      if (
        Object.keys(new_params["hosts"]).length <
        Object.keys(old_params["hosts"]).length
      ) {
        // we removed a host. check the old_params to see if there were any variables that
        //were removed along with it.
        let removed_hosts = Object.keys(old_params["hosts"]).filter((obj) => {
          return Object.keys(new_params["hosts"]).indexOf(obj) == -1;
        });
        for (let i = 0; i < removed_hosts.length; i++) {
          Object.entries(g_option_scheme).forEach(
            ([role_name, param_group]) => {
              if (param_group["unique"].length > 0) {
                //there are variables that pertain to a specific group that may have been modified
                param_group["unique"].forEach((unique_option) => {
                  if (
                    old_params["hosts"][removed_hosts[i]].hasOwnProperty(
                      unique_option.option_name
                    ) &&
                    old_params["hosts"][removed_hosts[i]][
                      unique_option.option_name
                    ] != ""
                  ) {
                    handle_warning_vars(
                      "",
                      old_params["hosts"][removed_hosts[i]][
                        unique_option.option_name
                      ],
                      removed_hosts[i] + "-" + unique_option.option_name,
                      old_params["time_stamp"],
                      role_name
                    );
                  }
                });
              }
            }
          );
        }
      } else if (
        Object.keys(new_params["hosts"]).length ==
        Object.keys(old_params["hosts"]).length
      ) {
        // lists are the same length
        // ensure that the hostnames are 1 to 1 between the lists
        let unique_old = Object.keys(old_params["hosts"]).filter((obj) => {
          return Object.keys(new_params["hosts"]).indexOf(obj) == -1;
        });
        let unique_new = Object.keys(new_params["hosts"]).filter((obj) => {
          return Object.keys(old_params["hosts"]).indexOf(obj) == -1;
        });
        if (unique_old.length == 0 && unique_new.length == 0) {
          //we have the same keys (i.e. hostnames in old and new.)
          Object.entries(new_params["hosts"]).forEach(
            ([hostname, host_obj]) => {
              if (
                JSON.stringify(old_params["hosts"][hostname]) !=
                JSON.stringify(new_params["hosts"][hostname])
              ) {
                //we've found the modified host
                //find the modified variable next.
                Object.entries(host_obj).forEach(
                  ([host_var_name, host_var_value]) => {
                    if (
                      new_params["hosts"][hostname][host_var_name] !=
                      old_params["hosts"][hostname][host_var_name]
                    ) {
                      //we have the modified variable, find which role is associated with it.
                      Object.entries(g_option_scheme).forEach(
                        ([role_name, param_group]) => {
                          if (param_group["unique"].length > 0) {
                            //there are variables that pertain to a specific group that may have been modified
                            param_group["unique"].forEach((unique_option) => {
                              if (unique_option.option_name == host_var_name) {
                                handle_warning_vars(
                                  new_params["hosts"][hostname][
                                    unique_option.option_name
                                  ],
                                  old_params["hosts"][hostname][
                                    unique_option.option_name
                                  ],
                                  hostname + "-" + unique_option.option_name,
                                  old_params["time_stamp"],
                                  role_name
                                );
                              }
                            });
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  }

  // see if groups have been modified
  if (
    old_params.hasOwnProperty("groups") &&
    new_params.hasOwnProperty("groups")
  ) {
    if (
      JSON.stringify(old_params["groups"]) !=
      JSON.stringify(new_params["groups"])
    ) {
      let new_param_group_list = Object.keys(new_params["groups"]);
      let old_param_group_list = Object.keys(old_params["groups"]);
      let unique_old = Object.keys(old_params["groups"]).filter((obj) => {
        return Object.keys(new_params["groups"]).indexOf(obj) == -1;
      });
      let unique_new = Object.keys(new_params["groups"]).filter((obj) => {
        return Object.keys(old_params["groups"]).indexOf(obj) == -1;
      });
      if (unique_old.length == 0 && unique_new.length == 0) {
        //we have the same groups in both old and new
        new_param_group_list.forEach((group_name) => {
          if (
            JSON.stringify(new_params["groups"][group_name]) !=
            JSON.stringify(old_params["groups"][group_name])
          ) {
            //This group has been modified.
            handle_warning_vars(
              JSON.stringify(new_params["groups"][group_name]),
              JSON.stringify(old_params["groups"][group_name]),
              "group-vars-" + group_name,
              old_params["time_stamp"],
              group_name
            );
          }
        });
      }
    }
  }

  // see if global options have been modified
  if (
    old_params.hasOwnProperty("options") &&
    new_params.hasOwnProperty("options")
  ) {
    if (
      JSON.stringify(old_params["options"]) !=
      JSON.stringify(new_params["options"])
    ) {
      // make all.yml again

      Object.entries(g_option_scheme).forEach(([role_name, param_group]) => {
        if (param_group["global"].length > 0) {
          //there are variables that pertain to a specific group that may have been modified
          param_group["global"].forEach((global_option) => {
            if (
              old_params["options"].hasOwnProperty(global_option.option_name) &&
              new_params["options"].hasOwnProperty(global_option.option_name) &&
              old_params["options"][global_option.option_name] !=
                new_params["options"][global_option.option_name]
            ) {
              handle_warning_vars(
                new_params["options"][global_option.option_name],
                old_params["options"][global_option.option_name],
                global_option.option_name,
                old_params["time_stamp"],
                role_name
              );
            }
          });
        }
      });
    }
  }

  // see if roles have been modified
  if (
    old_params.hasOwnProperty("roles") &&
    new_params.hasOwnProperty("roles")
  ) {
    if (
      JSON.stringify(old_params["roles"]) != JSON.stringify(new_params["roles"])
    ) {
      Object.entries(g_role_to_deploy_step_lut).forEach(
        ([role_name, deploy_step_ids]) => {
          if (
            old_params["roles"].hasOwnProperty(role_name) &&
            new_params["roles"].hasOwnProperty(role_name) &&
            JSON.stringify(old_params["roles"][role_name]) !=
              JSON.stringify(new_params["roles"][role_name])
          ) {
            handle_warning_vars(
              new_params["roles"][role_name].toString(),
              old_params["roles"][role_name].toString(),
              "roles-" + role_name,
              old_params["time_stamp"],
              role_name
            );
          }
        }
      );
    }
  }
}

function update_warning_messages(current_deploy_state) {
  let current_deploy_state_json = JSON.parse(current_deploy_state);
  let ansible_config_warning = {
    deploy_step_warnings: [],
  };

  Object.entries(current_deploy_state_json).forEach(
    ([deploy_step_id, state_vars]) => {
      if (
        current_deploy_state_json[deploy_step_id].hasOwnProperty(
          "warning_vars"
        ) &&
        current_deploy_state_json[deploy_step_id]["warning_vars"].length > 0
      ) {
        if (
          current_deploy_state_json[deploy_step_id]["lock_state"] === "complete"
        ) {
          let warning_entry = {};
          warning_entry["deploy_step_id"] = deploy_step_id;
          warning_entry["step_name"] =
            g_deploy_step_id_lut[deploy_step_id]["step_name"];
          warning_entry["inventory_files"] =
            g_deploy_step_id_lut[deploy_step_id]["inventory_files"];
          warning_entry["purge_playbooks"] =
            g_deploy_step_id_lut[deploy_step_id]["purge_playbooks"];
          warning_entry["warning_vars"] =
            current_deploy_state_json[deploy_step_id]["warning_vars"];
          warning_entry["roles"] =
            g_deploy_step_id_lut[deploy_step_id]["roles"];
          ansible_config_warning["deploy_step_warnings"].push(warning_entry);
        } else {
          delete current_deploy_state_json[deploy_step_id]["warning_msg"];
          delete current_deploy_state_json[deploy_step_id]["warning_vars"];
        }
      }
    }
  );

  if (ansible_config_warning["deploy_step_warnings"].length > 0) {
    let ansible_config_warning_msg = "";
    ansible_config_warning_msg +=
      "Warning: Ansible Configuration has been modified after deployment steps have been completed\n";
    ansible_config_warning_msg +=
      "You can fix this by completing one of the following:\n";
    ansible_config_warning_msg +=
      '    - run the corresponding purge command "ansible_runner -c <purge_command>" to undo your progress\n';
    ansible_config_warning_msg +=
      "    - change the modified variables back to the original value indicated.\n";
    ansible_config_warning_msg +=
      "    - re-generate the inventory files indicated, and redo the step again. (not recommended)\n";
    ansible_config_warning["deploy_step_warnings"].forEach((warning_entry) => {
      ansible_config_warning_msg += warning_entry["step_name"] + ":\n";
      ansible_config_warning_msg +=
        "     purge_command: " +
        warning_entry["purge_playbooks"].toString() +
        "\n";
      ansible_config_warning_msg +=
        "     Inventory File(s): " +
        warning_entry["inventory_files"].toString() +
        "\n";
      ansible_config_warning_msg +=
        "     affected roles: " + warning_entry["roles"].toString() + "\n\n";
    });
    current_deploy_state_json["deploy-step-ansible-config"]["warning_msg"] =
      ansible_config_warning_msg;
  } else if (
    current_deploy_state_json["deploy-step-ansible-config"].hasOwnProperty(
      "warning_msg"
    )
  ) {
    delete current_deploy_state_json["deploy-step-ansible-config"][
      "warning_msg"
    ];
  }
  return JSON.stringify(current_deploy_state_json);
}

function handle_warning_vars(
  new_value,
  old_value,
  var_name,
  old_time_stamp,
  role_name
) {
  let deploy_state = localStorage.getItem("ceph_deploy_state");
  let deploy_state_json = JSON.parse(deploy_state);
  Object.entries(deploy_state_json).forEach(([deploy_step_id, state_vars]) => {
    if (
      state_vars["lock_state"] === "complete" &&
      g_role_to_deploy_step_lut[role_name].includes(deploy_step_id)
    ) {
      let make_warning_var = false;
      if (!deploy_state_json[deploy_step_id].hasOwnProperty("warning_vars")) {
        deploy_state_json[deploy_step_id]["warning_vars"] = [];
        make_warning_var = true;
      } else {
        // we already have a warning vars array.
        let existing_warning_var = search_jarray_key_value_match(
          deploy_state_json[deploy_step_id]["warning_vars"],
          "var_name",
          var_name
        );
        if (existing_warning_var) {
          //warning var was already flagged. check to see if the user changed it back to the
          //value that was used during deployment.
          if (
            new_value === existing_warning_var["warning_var"]["original_value"]
          ) {
            // the user changed it back to the proper value, remove the warning variable.
            deploy_state_json[deploy_step_id]["warning_vars"].splice(
              existing_warning_var["index"]
            );
            if (deploy_state_json[deploy_step_id]["warning_vars"].length == 0) {
              delete deploy_state_json[deploy_step_id]["warning_msg"];
              delete deploy_state_json[deploy_step_id]["warning_vars"];
            } else {
              deploy_state_json[deploy_step_id]["warning_msg"] =
                make_warning_message(deploy_state_json, deploy_step_id);
            }
          } else {
            //the user changed it to something different than the original value.
            //update the current value of the warning var.
            deploy_state_json[deploy_step_id]["warning_vars"][
              existing_warning_var["index"]
            ]["current_value"] = new_value;
            make_warning_message(deploy_state_json, deploy_step_id);
          }
        } else {
          make_warning_var = true;
        }
      }
      if (make_warning_var) {
        //we need to make a warning variable and a warning message.
        let warning_var = {
          var_name: var_name,
          original_value: old_value,
          current_value: new_value,
          original_time_stamp: old_time_stamp,
        };
        deploy_state_json[deploy_step_id]["warning_vars"].push(warning_var);
        deploy_state_json[deploy_step_id]["warning_msg"] = make_warning_message(
          deploy_state_json,
          deploy_step_id
        );
      }
      localStorage.setItem(
        "ceph_deploy_state",
        JSON.stringify(deploy_state_json, null, 4)
      );
      sync_ceph_deploy_state();
    } else if (
      deploy_state_json[deploy_step_id].hasOwnProperty("warning_vars") &&
      state_vars["lock_state"] != "complete" &&
      g_role_to_deploy_step_lut[role_name].includes(deploy_step_id)
    ) {
      delete deploy_state_json[deploy_step_id]["warning_vars"];
      delete deploy_state_json[deploy_step_id]["warning_msg"];
      localStorage.setItem(
        "ceph_deploy_state",
        JSON.stringify(deploy_state_json, null, 4)
      );
      sync_ceph_deploy_state();
    }
  });
}

function make_warning_message(deploy_state_json, deploy_step_id) {
  let warning_message =
    "Warning: variables used to complete " +
    deploy_step_id +
    " have been modified.\n" +
    JSON.stringify(deploy_state_json[deploy_step_id]["warning_vars"], null, 4) +
    "\nYou may need to re-do this step.";
  return warning_message;
}

function search_jarray_key_value_match(json_array, key, value) {
  for (var i = 0; i < json_array.length; i++) {
    if (json_array[i].hasOwnProperty(key) && json_array[i][key] === value) {
      return {
        warning_var: json_array[i],
        index: i,
      };
    }
  }
  return null;
}

/**
 * hides/unhides the all-file-content div, and updates the icon on the show button.
 */
function show_all_file() {
  let all_file_content = document.getElementById("all-file-content");
  let show_button = document.getElementById("show-all-file-btn");
  if (all_file_content && all_file_content.classList.contains("hidden")) {
    all_file_content.classList.remove("hidden");
    show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    all_file_content.classList.add("hidden");
    show_button.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function show_rgwlb_file() {
  let rgwlb_file_content = document.getElementById("rgwlb-file-content");
  let show_button = document.getElementById("show-rgwlb-file-btn");
  if (rgwlb_file_content && rgwlb_file_content.classList.contains("hidden")) {
    rgwlb_file_content.classList.remove("hidden");
    show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    rgwlb_file_content.classList.add("hidden");
    show_button.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function show_nfss_file() {
  let nfss_file_content = document.getElementById("nfss-file-content");
  let show_button = document.getElementById("show-nfss-file-btn");
  if (nfss_file_content && nfss_file_content.classList.contains("hidden")) {
    nfss_file_content.classList.remove("hidden");
    show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    nfss_file_content.classList.add("hidden");
    show_button.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

function show_smbs_file() {
  let smbs_file_content = document.getElementById("smbs-file-content");
  let show_button = document.getElementById("show-smbs-file-btn");
  if (smbs_file_content && smbs_file_content.classList.contains("hidden")) {
    smbs_file_content.classList.remove("hidden");
    show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    smbs_file_content.classList.add("hidden");
    show_button.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

/**
 * hides/unhides the host-file-content div, and updates the icon on the show button.
 */
function show_host_file() {
  let host_file_content = document.getElementById("host-file-content");
  let show_button = document.getElementById("show-host-file-btn");
  if (host_file_content && host_file_content.classList.contains("hidden")) {
    host_file_content.classList.remove("hidden");
    show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    host_file_content.classList.add("hidden");
    show_button.innerHTML = '<i class="fas fa-eye"></i>';
  }
}

/**
 * uses the make_hosts helper script to create /usr/share/ceph-ansible/hosts.
 * This will use the core_params.json file to create this. It will also
 * create the inventory files required for each host in /usr/share/ceph-ansible/host_vars/
 */
function generate_host_file() {
  var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_hosts"];
  var result_json = null;
  var generate_host_file_proc = cockpit.spawn(spawn_args, {
    superuser: "require",
  });
  generate_host_file_proc.done(function (data) {
    let msg_color = "";
    let msg_label = "";
    let msg_content = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      var host_file_content_proc = cockpit.spawn(["cat", result_json.path], {
        superuser: "require",
      });
      host_file_content_proc.done(function (data) {
        document.getElementById("host-file-content").innerText = data;
        document.getElementById("host-file-content").classList.remove("hidden");
        let show_button = document.getElementById("show-host-file-btn");
        show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        show_button.classList.remove("hidden");
        show_button.addEventListener("click", show_host_file);
        document.getElementById("generate-host-file-btn").innerHTML =
          "Generate Again";
        document
          .getElementById("inv-file-hosts-default")
          .classList.add("hidden");
        update_localStorage_inv_file_requirements("hosts", data, true);
        if (inventory_file_generation_completed_check()) {
          document
            .getElementById("ansible-config-inv-nxt")
            .removeAttribute("disabled");
        } else {
          document.getElementById("ansible-config-inv-nxt").disabled = true;
        }
      });
      host_file_content_proc.fail(function (ex, data) {
        console.log("host_file_content_proc (FAIL): ", data);
      });
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

/**
 * uses the make_all helper script to create /usr/share/ceph-ansible/group_vars/all.yml
 */
function generate_all_file() {
  var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_all"];
  var result_json = null;
  var generate_all_file_proc = cockpit.spawn(spawn_args, {
    superuser: "require",
  });
  generate_all_file_proc.done(function (data) {
    let msg_color = "";
    let msg_label = "";
    let msg_content = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      var all_file_content_proc = cockpit.spawn(["cat", result_json.path], {
        superuser: "require",
      });
      all_file_content_proc.done(function (data) {
        document.getElementById("all-file-content").innerText = data;
        document.getElementById("all-file-content").classList.remove("hidden");
        let show_button = document.getElementById("show-all-file-btn");
        show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        show_button.classList.remove("hidden");
        show_button.addEventListener("click", show_all_file);
        document.getElementById("generate-all-file-btn").innerHTML =
          "Generate Again";
        document.getElementById("inv-file-all-default").classList.add("hidden");
        update_localStorage_inv_file_requirements("all.yml", data, true);
        if (inventory_file_generation_completed_check()) {
          document
            .getElementById("ansible-config-inv-nxt")
            .removeAttribute("disabled");
        }
      });
      all_file_content_proc.fail(function (ex, data) {
        console.log("all_file_content_proc (FAIL): ", data);
      });
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

function generate_nfss_file() {
  var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_nfss"];
  var result_json = null;
  var generate_nfss_file_proc = cockpit.spawn(spawn_args, {
    superuser: "require",
  });
  generate_nfss_file_proc.done(function (data) {
    let msg_color = "";
    let msg_label = "";
    let msg_content = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      var nfss_file_content_proc = cockpit.spawn(["cat", result_json.path], {
        superuser: "require",
      });
      nfss_file_content_proc.done(function (data) {
        document.getElementById("nfss-file-content").innerText = data;
        document.getElementById("nfss-file-content").classList.remove("hidden");
        let show_button = document.getElementById("show-nfss-file-btn");
        show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        show_button.classList.remove("hidden");
        show_button.addEventListener("click", show_nfss_file);
        document.getElementById("generate-nfss-file-btn").innerHTML =
          "Generate Again";
        document
          .getElementById("inv-file-nfss-default")
          .classList.add("hidden");
        update_localStorage_inv_file_requirements("nfss.yml", data, true);
        if (inventory_file_generation_completed_check()) {
          document
            .getElementById("ansible-config-inv-nxt")
            .removeAttribute("disabled");
        }
      });
      nfss_file_content_proc.fail(function (ex, data) {
        console.log("nfss_file_content_proc (FAIL): ", data);
      });
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

function generate_smbs_file() {
  var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_smbs"];
  var result_json = null;
  var generate_smbs_file_proc = cockpit.spawn(spawn_args, {
    superuser: "require",
  });
  generate_smbs_file_proc.done(function (data) {
    let msg_color = "";
    let msg_label = "";
    let msg_content = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      var smbs_file_content_proc = cockpit.spawn(["cat", result_json.path], {
        superuser: "require",
      });
      smbs_file_content_proc.done(function (data) {
        document.getElementById("smbs-file-content").innerText = data;
        document.getElementById("smbs-file-content").classList.remove("hidden");
        let show_button = document.getElementById("show-smbs-file-btn");
        show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        show_button.classList.remove("hidden");
        show_button.addEventListener("click", show_smbs_file);
        document.getElementById("generate-smbs-file-btn").innerHTML =
          "Generate Again";
        document
          .getElementById("inv-file-smbs-default")
          .classList.add("hidden");
        update_localStorage_inv_file_requirements("smbs.yml", data, true);
        if (inventory_file_generation_completed_check()) {
          document
            .getElementById("ansible-config-inv-nxt")
            .removeAttribute("disabled");
        }
      });
      smbs_file_content_proc.fail(function (ex, data) {
        console.log("smbs_file_content_proc (FAIL): ", data);
      });
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

function generate_rgwloadbalancers_file() {
  var spawn_args = [
    "/usr/share/cockpit/ceph-deploy/helper_scripts/make_rgwloadbalancers",
  ];
  var result_json = null;
  var generate_rgwlb_file_proc = cockpit.spawn(spawn_args, {
    superuser: "require",
  });
  generate_rgwlb_file_proc.done(function (data) {
    let msg_color = "";
    let msg_label = "";
    let msg_content = "";
    try {
      result_json = JSON.parse(data);
    } catch (e) {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    if (result_json.hasOwnProperty("success_msg")) {
      msg_color = "#20a030";
      msg_label = "Message: ";
      msg_content = result_json.success_msg;
      var rgwlb_file_content_proc = cockpit.spawn(["cat", result_json.path], {
        superuser: "require",
      });
      rgwlb_file_content_proc.done(function (data) {
        document.getElementById("rgwlb-file-content").innerText = data;
        document
          .getElementById("rgwlb-file-content")
          .classList.remove("hidden");
        let show_button = document.getElementById("show-rgwlb-file-btn");
        show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        show_button.classList.remove("hidden");
        show_button.addEventListener("click", show_rgwlb_file);
        document.getElementById("generate-rgwlb-file-btn").innerHTML =
          "Generate Again";
        document
          .getElementById("inv-file-rgwlb-default")
          .classList.add("hidden");
        update_localStorage_inv_file_requirements(
          "rgwloadbalancers.yml",
          data,
          true
        );
        if (inventory_file_generation_completed_check()) {
          document
            .getElementById("ansible-config-inv-nxt")
            .removeAttribute("disabled");
        }
      });
      rgwlb_file_content_proc.fail(function (ex, data) {
        console.log("rgwlb_file_content_proc (FAIL): ", data);
      });
    } else {
      msg_color = "#bd3030";
      msg_label = "Error:";
      msg_content = "Unexpected return value.";
    }
    show_snackbar_msg(msg_label, msg_content, msg_color, "snackbar");
  });
}

/**
 * creates an iframe which uses terminal.html. This in turn will
 * use a modified version of terminal.js that will get "terminal-command"
 * from local storage and run it when it starts.
 * @param {string} termID
 * @returns
 */
function makeTerminal(termID) {
  let term = document.createElement("iframe");
  term.setAttribute("width", "100%");
  term.setAttribute("height", "500px");
  term.id = termID;
  term.title = "Terminal";
  term.src = "terminal.html";
  return term;
}

/**
 * update the playbook_state local storage with content from
 * /usr/share/cockpit/ceph-deploy/state/playbook_state.json and enable the
 * corresponding html element (button) with id==key. to allow for progression
 * within the module.
 * @param {Object} content
 */
function update_playbook_state(content) {
  let prev_state_json_str = localStorage.getItem("playbook_state") ?? "{}";
  let prev_state_json = JSON.parse(prev_state_json_str);
  if (content && prev_state_json != content) {
    localStorage.setItem("playbook_state", JSON.stringify(content));
    Object.entries(content).forEach(([playbook, obj]) => {
      let target_button = document.getElementById(playbook);
      if (content.hasOwnProperty(playbook) && content[playbook].result === 0) {
        if (target_button) {
          target_button.removeAttribute("disabled");
        }
        if (
          !prev_state_json.hasOwnProperty(playbook) ||
          (prev_state_json.hasOwnProperty(playbook) &&
            prev_state_json[playbook].time_stamp !=
              content[playbook].time_stamp)
        ) {
          show_snackbar_msg(
            "Playbook (" + playbook + "): ",
            "Completed Successfully",
            "#20a030",
            "snackbar"
          );
        }
      } else if (content.hasOwnProperty(playbook)) {
        if (target_button) {
          target_button.disabled = true;
        }
        if (
          !prev_state_json.hasOwnProperty(playbook) ||
          (prev_state_json.hasOwnProperty(playbook) &&
            prev_state_json[playbook].time_stamp !=
              content[playbook].time_stamp)
        ) {
          show_snackbar_msg(
            "Playbook (" + playbook + "):",
            "Unsuccessful",
            "#bd3030",
            "snackbar"
          );
        }
      }
    });
  }
  setup_main_menu();
}

/**
 * watch the file /usr/share/cockpit/ceph-deploy/state/playbook_state.json
 * for changes and trigger update_playbook_state when the file is accessed.
 */
function monitor_playbook_state_file() {
  g_deploy_file = cockpit.file(
    "/usr/share/cockpit/ceph-deploy/state/playbook_state.json",
    { syntax: JSON }
  );
  g_deploy_file.watch(function (content) {
    update_playbook_state(content);
  });
}

/**
 * set the terminal-command value in local storage and spawn a new
 * terminal within the appropriate iframe.
 */
function ansible_ping() {
  localStorage.setItem("terminal-command", "ansible_runner -c ping_all\n");
  let ping_term = document.getElementById("terminal-ping");
  if (!ping_term) {
    ping_term = makeTerminal("terminal-ping");
  }
  document.getElementById("terminal-ping-iframe").appendChild(ping_term);
}

/**
 * perform the device_alias playbook within a new terminal.
 */
function ansible_device_alias() {
  localStorage.setItem("terminal-command", "ansible_runner -c device_alias\n");
  let device_alias_term = document.getElementById("terminal-device-alias");
  if (!device_alias_term) {
    device_alias_term = makeTerminal("terminal-device-alias");
  }
  document
    .getElementById("terminal-device-alias-iframe")
    .appendChild(device_alias_term);
}

/**
 * perform the deploy_core playbook within a new terminal.
 */
function ansible_core() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_core\n");
  let core_term = document.getElementById("terminal-core");
  if (!core_term) {
    core_term = makeTerminal("terminal-core");
  }
  document.getElementById("terminal-core-iframe").appendChild(core_term);
}

/**
 * perform the deploy_cephfs playbook within a new terminal.
 */
function ansible_cephfs() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_cephfs\n");
  let cephfs_term = document.getElementById("terminal-cephfs");
  if (!cephfs_term) {
    cephfs_term = makeTerminal("terminal-cephfs");
  }
  document.getElementById("terminal-cephfs-iframe").appendChild(cephfs_term);
}

/**
 * perform the deploy_radosgw playbook within a new terminal.
 */
function ansible_radosgw() {
  localStorage.setItem(
    "terminal-command",
    "ansible_runner -c deploy_radosgw\n"
  );
  let radosgw_term = document.getElementById("terminal-radosgw");
  if (!radosgw_term) {
    radosgw_term = makeTerminal("terminal-radosgw");
  }
  document.getElementById("terminal-radosgw-iframe").appendChild(radosgw_term);
}

/**
 * perform the deploy_iscsi playbook within a new terminal.
 */
function ansible_iscsi() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_iscsi\n");
  let iscsi_term = document.getElementById("terminal-iscsi");
  if (!iscsi_term) {
    iscsi_term = makeTerminal("terminal-iscsi");
  }
  document.getElementById("terminal-iscsi-iframe").appendChild(iscsi_term);
}

function ansible_rgwlb() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_rgwlb\n");
  let rgwlb_term = document.getElementById("terminal-rgwlb");
  if (!rgwlb_term) {
    rgwlb_term = makeTerminal("terminal-rgwlb");
  }
  document.getElementById("terminal-rgwlb-iframe").appendChild(rgwlb_term);
}

function ansible_nfs() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_nfs\n");
  let nfs_term = document.getElementById("terminal-nfs");
  if (!nfs_term) {
    nfs_term = makeTerminal("terminal-nfs");
  }
  document.getElementById("terminal-nfs-iframe").appendChild(nfs_term);
}

function ansible_smb() {
  localStorage.setItem("terminal-command", "ansible_runner -c deploy_smb\n");
  let smb_term = document.getElementById("terminal-smb");
  if (!smb_term) {
    smb_term = makeTerminal("terminal-smb");
  }
  document.getElementById("terminal-smb-iframe").appendChild(smb_term);
}

/**
 * perform the deploy_dashboard playbook within a new terminal.
 */
function ansible_dashboard() {
  localStorage.setItem(
    "terminal-command",
    "ansible_runner -c deploy_dashboard\n"
  );
  let dashboard_term = document.getElementById("terminal-dashboard");
  if (!dashboard_term) {
    dashboard_term = makeTerminal("terminal-dashboard");
  }
  document
    .getElementById("terminal-dashboard-iframe")
    .appendChild(dashboard_term);
}

/**
 * toggle the visibility of the panel body and icon of the button
 * corresponding to pb_id and btn_id respectively.
 * @param {string} btn_id
 * @param {string} pb_id
 */
function toggle_panel_body_visibility(btn_id, pb_id) {
  let pb = document.getElementById(pb_id);
  let btn = document.getElementById(btn_id);
  if (pb && btn) {
    if (pb.classList.contains("hidden")) {
      pb.classList.remove("hidden");
      btn.classList.remove("fa-angle-down");
      btn.classList.add("fa-angle-up");
    } else {
      pb.classList.add("hidden");
      btn.classList.remove("fa-angle-up");
      btn.classList.add("fa-angle-down");
    }
  }
}

/**
 * set up event listeners for the buttons that toggle the visibility of
 * a given panel.
 */
function setup_panel_vis_toggle_buttons() {
  let vis_toggle_buttons = document.getElementsByClassName(
    "cd-panel-vis-toggle"
  );
  for (let i = 0; i < vis_toggle_buttons.length; i++) {
    let target_content_id = vis_toggle_buttons[i].getAttribute("for");
    let target_content_obj = document.getElementById(target_content_id);
    let btn_id = vis_toggle_buttons[i].id;
    if (target_content_id && target_content_obj && btn_id) {
      vis_toggle_buttons[i].addEventListener("click", () => {
        toggle_panel_body_visibility(btn_id, target_content_id);
      });
    }
  }
}

/**
 * set up event listeners for each module's start button (found in main menu).
 */
function setup_deploy_step_start_buttons() {
  let start_buttons = document.getElementsByClassName(
    "cd-deploy-step-start-btn"
  );
  for (let i = 0; i < start_buttons.length; i++) {
    let target_div = start_buttons[i].getAttribute("for");
    start_buttons[i].addEventListener("click", () => {
      document.getElementById("cd-main-menu").classList.add("hidden");
      document.getElementById(target_div).classList.remove("hidden");
    });
  }
}

/**
 *
 */
function setup_main_menu_links() {
  let main_menu_links = document.getElementsByClassName(
    "progress-bar-main-back"
  );
  if (main_menu_links) {
    for (let i = 0; i < main_menu_links.length; i++) {
      main_menu_links[i].addEventListener("click", () => {
        let ceph_deploy_state = JSON.parse(
          localStorage.getItem("ceph_deploy_state") ??
            JSON.stringify(g_ceph_deploy_default_state)
        );
        Object.entries(ceph_deploy_state).forEach(([deploy_step_id, obj]) => {
          let content = document.getElementById(obj.step_content_id);
          if (content) {
            content.classList.add("hidden");
          }
        });

        let main_menu_content = document.getElementById("cd-main-menu");
        if (main_menu_content) {
          main_menu_content.classList.remove("hidden");
        }
      });
    }
  }
}

/**
 * configure all prev, next and done buttons for each deploy-step with default behavior.
 */
function setup_deploy_step_nav_buttons() {
  let done_buttons = document.getElementsByClassName("cd-deploy-step-done-btn");
  if (done_buttons) {
    for (let i = 0; i < done_buttons.length; i++) {
      let step_content_id = done_buttons[i].getAttribute("for");
      if (step_content_id) {
        let step_content = document.getElementById(step_content_id);
        if (step_content) {
          let deploy_step_id = step_content.getAttribute("for");
          if (deploy_step_id) {
            done_buttons[i].addEventListener("click", () => {
              let deploy_state = JSON.parse(
                localStorage.getItem("ceph_deploy_state") ??
                  JSON.stringify(g_ceph_deploy_default_state)
              );
              deploy_state[deploy_step_id].lock_state = "complete";
              localStorage.setItem(
                "ceph_deploy_state",
                JSON.stringify(deploy_state)
              );
              sync_ceph_deploy_state();
              step_content.classList.add("hidden");
              document
                .getElementById("cd-main-menu")
                .classList.remove("hidden");
              setup_main_menu();
            });
          }
        }
      }
    }
  }

  let next_buttons = document.getElementsByClassName("cd-deploy-step-next-btn");
  if (next_buttons) {
    for (let i = 0; i < next_buttons.length; i++) {
      let step_content_id = next_buttons[i].getAttribute("for");
      if (step_content_id) {
        next_buttons[i].addEventListener("click", () => {
          let step_content = document.getElementById(step_content_id);
          if (step_content) {
            let ceph_deploy_step_id = step_content.getAttribute("for");
            let deploy_state = JSON.parse(
              localStorage.getItem("ceph_deploy_state") ??
                JSON.stringify(g_ceph_deploy_default_state)
            );
            if (
              deploy_state.hasOwnProperty(ceph_deploy_step_id) &&
              deploy_state[ceph_deploy_step_id].step_content_id ==
                step_content_id
            ) {
              let prog_int = Number(deploy_state[ceph_deploy_step_id].progress);
              prog_int++;
              deploy_state[ceph_deploy_step_id].progress = prog_int.toString();
              localStorage.setItem(
                "ceph_deploy_state",
                JSON.stringify(deploy_state)
              );
              sync_ceph_deploy_state();
              setup_progress_bar(ceph_deploy_step_id);
            }
          }
        });
      }
    }
  }

  let prev_buttons = document.getElementsByClassName("cd-deploy-step-prev-btn");
  if (prev_buttons) {
    for (let i = 0; i < prev_buttons.length; i++) {
      let step_content_id = prev_buttons[i].getAttribute("for");
      if (step_content_id) {
        prev_buttons[i].addEventListener("click", () => {
          let step_content = document.getElementById(step_content_id);
          if (step_content) {
            let ceph_deploy_step_id = step_content.getAttribute("for");
            let deploy_state = JSON.parse(
              localStorage.getItem("ceph_deploy_state") ??
                JSON.stringify(g_ceph_deploy_default_state)
            );
            if (
              deploy_state.hasOwnProperty(ceph_deploy_step_id) &&
              deploy_state[ceph_deploy_step_id].step_content_id ==
                step_content_id
            ) {
              let prog_int = Number(deploy_state[ceph_deploy_step_id].progress);
              if (prog_int > 0) {
                prog_int--;
              } else {
                prog_int = 0;
              }
              deploy_state[ceph_deploy_step_id].progress = prog_int.toString();
              localStorage.setItem(
                "ceph_deploy_state",
                JSON.stringify(deploy_state)
              );
              sync_ceph_deploy_state();
              setup_progress_bar(ceph_deploy_step_id);
            }
          }
        });
      }
    }
  }
}

/**
 * set up progress bars for the deploy step with the id==step_id.
 * @param {string} deploy_step_key
 */
function setup_progress_bar(deploy_step_key) {
  let ceph_deploy_state = JSON.parse(
    localStorage.getItem("ceph_deploy_state") ??
      JSON.stringify(g_ceph_deploy_default_state)
  );
  let step_div = document.getElementById(
    ceph_deploy_state[deploy_step_key].step_content_id
  );
  if (!step_div) return;
  let progress_bar_steps = step_div.querySelectorAll(
    ":scope [data-progress-bar-idx]"
  );
  if (progress_bar_steps) {
    for (let i = 0; i < progress_bar_steps.length; i++) {
      if (
        progress_bar_steps[i].dataset.progressBarIdx ===
        ceph_deploy_state[deploy_step_key].progress
      ) {
        progress_bar_steps[i].classList.add("progress-current-step");
        progress_bar_steps[i].classList.remove("progress-completed-step");
        let current_step_content = step_div.querySelector(
          `:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`
        );
        if (current_step_content) {
          current_step_content.classList.remove("hidden");
        }
      } else if (
        Number(progress_bar_steps[i].dataset.progressBarIdx) <
        Number(ceph_deploy_state[deploy_step_key].progress)
      ) {
        progress_bar_steps[i].classList.remove("progress-current-step");
        progress_bar_steps[i].classList.add("progress-completed-step");
        let completed_step_content = step_div.querySelector(
          `:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`
        );
        if (completed_step_content) {
          completed_step_content.classList.add("hidden");
        }
      } else {
        progress_bar_steps[i].classList.remove("progress-current-step");
        progress_bar_steps[i].classList.remove("progress-completed-step");
        let next_step_content = step_div.querySelector(
          `:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`
        );
        if (next_step_content) {
          next_step_content.classList.add("hidden");
        }
      }
    }
  }

  let prev_button = step_div.querySelector(":scope .cd-deploy-step-prev-btn");
  let next_button = step_div.querySelector(":scope .cd-deploy-step-next-btn");
  let done_button = step_div.querySelector(":scope .cd-deploy-step-done-btn");

  if (prev_button) {
    if (ceph_deploy_state[deploy_step_key].progress === "0") {
      prev_button.disabled = true;
    } else {
      prev_button.removeAttribute("disabled");
    }
  }

  if (next_button) {
    if (
      Number(ceph_deploy_state[deploy_step_key].progress) ===
      progress_bar_steps.length - 1
    ) {
      next_button.classList.add("hidden");
      if (done_button) done_button.classList.remove("hidden");
    } else {
      next_button.classList.remove("hidden");
      if (done_button) done_button.classList.add("hidden");
    }
  }
}

/**
 * set up event listeners for buttons.
 */
function setup_buttons() {
  setup_main_menu();
  setup_main_menu_links();
  setup_deploy_step_start_buttons();
  setup_panel_vis_toggle_buttons();
  setup_deploy_step_nav_buttons();
  setup_progress_bar("deploy-step-ansible-config");
  setup_progress_bar("deploy-step-core");
  setup_progress_bar("deploy-step-cephfs");
  setup_progress_bar("deploy-step-rgw");
  setup_progress_bar("deploy-step-iscsi");
  setup_progress_bar("deploy-step-rgwlb");
  setup_progress_bar("deploy-step-nfs");
  setup_progress_bar("deploy-step-smb");
  setup_progress_bar("deploy-step-dashboard");

  document.getElementById("new-host-btn").addEventListener("click", add_host);
  document
    .getElementById("update-roles-btn")
    .addEventListener("click", update_role_request);
  document
    .getElementById("global-options-btn")
    .addEventListener("click", update_options_request);
  document
    .getElementById("generate-host-file-btn")
    .addEventListener("click", generate_host_file);
  document
    .getElementById("generate-all-file-btn")
    .addEventListener("click", generate_all_file);
  document
    .getElementById("generate-rgwlb-file-btn")
    .addEventListener("click", generate_rgwloadbalancers_file);
  document
    .getElementById("generate-nfss-file-btn")
    .addEventListener("click", generate_nfss_file);
  document
    .getElementById("generate-smbs-file-btn")
    .addEventListener("click", generate_smbs_file);
  document
    .getElementById("ansible-ping-btn")
    .addEventListener("click", ansible_ping);
  document
    .getElementById("ansible-device-alias-btn")
    .addEventListener("click", ansible_device_alias);
  document
    .getElementById("ansible-core-btn")
    .addEventListener("click", ansible_core);
  document
    .getElementById("ansible-cephfs-btn")
    .addEventListener("click", ansible_cephfs);
  document
    .getElementById("ansible-radosgw-btn")
    .addEventListener("click", ansible_radosgw);
  document
    .getElementById("ansible-iscsi-btn")
    .addEventListener("click", ansible_iscsi);
  document
    .getElementById("ansible-rgwlb-btn")
    .addEventListener("click", ansible_rgwlb);
  document
    .getElementById("ansible-nfs-btn")
    .addEventListener("click", ansible_nfs);
  document
    .getElementById("ansible-smb-btn")
    .addEventListener("click", ansible_smb);
  document
    .getElementById("ansible-dashboard-btn")
    .addEventListener("click", ansible_dashboard);
  document
    .getElementById("toggle-theme")
    .addEventListener("change", switch_theme);
}

const equalsIgnoreOrder = (a, b) => {
  if (a.length !== b.length) return false;
  const uniqueValues = new Set([...a, ...b]);
  for (const v of uniqueValues) {
    const aCount = a.filter((e) => e === v).length;
    const bCount = b.filter((e) => e === v).length;
    if (aCount !== bCount) return false;
  }
  return true;
};

function get_converged_main_menu_state() {
  deploy_step_current_state_json_str =
    localStorage.getItem("ceph_deploy_state") ??
    JSON.stringify(g_ceph_deploy_default_state);
  deploy_step_current_states = JSON.parse(deploy_step_current_state_json_str);

  let intermediate_deploy_state = JSON.parse(
    JSON.stringify(deploy_step_current_states)
  );
  let state_converged = false;
  while (!state_converged) {
    //set complete state based on required playbooks being run
    let playbook_state_json_str =
      localStorage.getItem("playbook_state") ?? "{}";
    let playbook_state_json = JSON.parse(playbook_state_json_str);
    Object.entries(deploy_step_current_states).forEach(
      ([deploy_step_id, obj]) => {
        let tmp_requirements = [];
        for (let pb_req in obj.playbook_completion_requirements) {
          if (
            !playbook_state_json.hasOwnProperty(
              obj.playbook_completion_requirements[pb_req]
            ) ||
            playbook_state_json[obj.playbook_completion_requirements[pb_req]]
              .result != 0
          ) {
            if (obj.lock_state == "complete") {
              obj.lock_state = "unlocked";
              obj.progress = "0";
            }
          } else if (
            playbook_state_json.hasOwnProperty(
              obj.playbook_completion_requirements[pb_req]
            ) &&
            playbook_state_json[obj.playbook_completion_requirements[pb_req]]
              .result === 0
          ) {
            tmp_requirements.push(obj.playbook_completion_requirements[pb_req]);
            if (
              equalsIgnoreOrder(
                tmp_requirements,
                obj.playbook_completion_requirements
              ) &&
              obj.lock_state === "unlocked"
            ) {
              obj.lock_state = "complete";
            }
          }
        }
      }
    );
    //use the current parameters to prevent unlocking a step that
    //needs roles assigned.
    let current_params_str = localStorage.getItem("current_params") ?? "{}";
    let current_params = JSON.parse(current_params_str);
    // unlock the steps that have their unlock requirements met and update local storage.
    Object.entries(deploy_step_current_states).forEach(
      ([deploy_step_id, obj]) => {
        if (obj.lock_state != "complete") {
          // objects that are marked complete should be left alone. The playbooks that are
          // required to be completed have been verified completed.
          if (obj.unlock_requirements.length > 0) {
            obj.lock_state = "locked"; // pre-emptively lock the deployment step
          }
          for (let i = 0; i < obj.unlock_requirements.length; i++) {
            if (
              deploy_step_current_states[obj.unlock_requirements[i]]
                .lock_state == "complete"
            ) {
              if (
                current_params.hasOwnProperty("roles") &&
                g_deploy_step_id_lut[deploy_step_id]["roles"].length > 0
              ) {
                // only unlock them if there is are hosts assigned the required roles.
                let role_count = 0;
                let role_target =
                  g_deploy_step_id_lut[deploy_step_id]["roles"].length;
                g_deploy_step_id_lut[deploy_step_id]["roles"].forEach(
                  (required_role) => {
                    if (
                      current_params["roles"].hasOwnProperty(required_role) &&
                      current_params["roles"][required_role].length > 0
                    ) {
                      role_count++;
                    }
                  }
                );
                deploy_step_current_states[deploy_step_id].lock_state =
                  role_count === role_target ? "unlocked" : "locked";
                break;
              } else {
                deploy_step_current_states[deploy_step_id].lock_state =
                  "unlocked";
                break;
              }
            }
          }
        }
      }
    );

    deploy_step_current_states = JSON.parse(
      update_warning_messages(JSON.stringify(deploy_step_current_states))
    );

    //check to see if anything was updated, if not, we have converged, break out of while loop.
    if (
      JSON.stringify(intermediate_deploy_state) ===
      JSON.stringify(deploy_step_current_states)
    ) {
      // we have iterated enough times to converge state.
      state_converged = true;
    } else {
      // the two differ, re-assign the intermediate deploy state to the current value of deploy_step_current_states
      // and do another pass until they converge.
      intermediate_deploy_state = JSON.parse(
        JSON.stringify(deploy_step_current_states)
      );
    }
  }
  return deploy_step_current_states;
}

/**
 * update the state of the main menu according to the deploy states stored in local storage.
 */
function setup_main_menu() {
  let deploy_step_ids = [
    "deploy-step-preconfig",
    "deploy-step-ansible-config",
    "deploy-step-core",
    "deploy-step-cephfs",
    "deploy-step-nfs",
    "deploy-step-smb",
    "deploy-step-rgw",
    "deploy-step-rgwlb",
    "deploy-step-iscsi",
    "deploy-step-dashboard",
  ];
  let deploy_step_current_states = get_converged_main_menu_state();

  localStorage.setItem(
    "ceph_deploy_state",
    JSON.stringify(deploy_step_current_states, null, 4)
  );
  sync_ceph_deploy_state();

  // update the appearance based on updated states
  for (let i = 0; i < deploy_step_ids.length; i++) {
    let deploy_step_element = document.getElementById(deploy_step_ids[i]);
    if (deploy_step_element) {
      let status_div = deploy_step_element.querySelector(".cd-step-status");
      let start_btn = deploy_step_element.querySelector(
        ".cd-deploy-step-start-btn"
      );
      if (
        deploy_step_current_states[deploy_step_ids[i]].lock_state == "complete"
      ) {
        deploy_step_element.classList.add("cd-step-complete");
        deploy_step_element.classList.remove("cd-step-warning");
        if (status_div && start_btn) {
          status_div.innerHTML = '<i class="fas fa-check"></i>';
          status_div.title = "completed";
          start_btn.classList.remove("hidden");
          start_btn.title = "redo";
          start_btn.innerHTML = '<i class="fas fa-redo"></i>';
        }
      } else if (
        deploy_step_current_states[deploy_step_ids[i]].lock_state == "unlocked"
      ) {
        deploy_step_element.classList.remove("cd-step-complete");
        deploy_step_element.classList.remove("cd-step-warning");
        if (status_div && start_btn) {
          status_div.innerHTML = '<i class="fas fa-lock-open"></i>';
          status_div.title = "ready";
          start_btn.classList.remove("hidden");
          start_btn.title = "start";
          start_btn.innerHTML = '<i class="fas fa-arrow-circle-right"></i>';
        }
      } else if (
        deploy_step_current_states[deploy_step_ids[i]].lock_state == "locked"
      ) {
        deploy_step_element.classList.remove("cd-step-complete");
        deploy_step_element.classList.remove("cd-step-warning");
        if (status_div && start_btn) {
          status_div.innerHTML = '<i class="fas fa-lock"></i>';
          status_div.title = "locked: complete required steps to unlock.";
          start_btn.classList.add("hidden");
          start_btn.title = "start";
        }
      }
      if (
        deploy_step_current_states[deploy_step_ids[i]].hasOwnProperty(
          "warning_msg"
        )
      ) {
        deploy_step_element.classList.remove("cd-step-complete");
        deploy_step_element.classList.add("cd-step-warning");
        if (status_div && start_btn) {
          status_div.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
          status_div.title =
            deploy_step_current_states[deploy_step_ids[i]].warning_msg;
          start_btn.classList.remove("hidden");
          start_btn.title =
            deploy_step_current_states[deploy_step_ids[i]].warning_msg;
          start_btn.innerHTML = '<i class="fas fa-redo"></i>';
        }
      }
    }
  }
}

function inventory_file_generation_completed_check() {
  let inv_file_req_str =
    localStorage.getItem("inventory_files") ??
    JSON.stringify(g_inv_default_requirements);
  let inv_file_req_obj = JSON.parse(inv_file_req_str);
  let ret_val = true;
  Object.entries(inv_file_req_obj).forEach(([key, obj]) => {
    if (!obj.completed) {
      ret_val = false;
    }
  });
  return ret_val;
}

function update_localStorage_inv_file_requirements(
  key,
  content,
  completed_flag
) {
  let inv_file_req_str =
    localStorage.getItem("inventory_files") ??
    JSON.stringify(g_inv_default_requirements);
  let inv_file_req_obj = JSON.parse(inv_file_req_str);
  if (!inv_file_req_obj.hasOwnProperty(key)) {
    inv_file_req_obj[key] = {};
  }
  inv_file_req_obj[key].content = content;
  inv_file_req_obj[key].completed = completed_flag;
  localStorage.setItem("inventory_files", JSON.stringify(inv_file_req_obj));
}

/**
 * update the files stored on the administrator node that are used to store deploy state.
 */
function sync_ceph_deploy_state() {
  let ceph_deploy_state_json_str =
    localStorage.getItem("ceph_deploy_state") ??
    JSON.stringify(g_ceph_deploy_default_state, null, 4);
  let ceph_deploy_state_file = cockpit.file(
    "/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json"
  );
  ceph_deploy_state_file.read().then((content, tag) => {
    if (ceph_deploy_state_json_str != content) {
      //localStorage and state file on server are not the same.
      //Update the state file stored on server.
      let update_state_file = ceph_deploy_state_file.replace(
        ceph_deploy_state_json_str
      );
      update_state_file.then((tag) => {
        ceph_deploy_state_file.close();
        localStorage.setItem("ceph_deploy_state", ceph_deploy_state_json_str);
      });
      update_state_file.catch((e) => {
        console.log(
          "/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json could not be updated."
        );
        ceph_deploy_state_file.close();
      });
    }
  });

  let playbook_state_json = localStorage.getItem("playbook_state") ?? "{}";
  localStorage.setItem("playbook_state", playbook_state_json);
  let playbook_state_obj = JSON.parse(playbook_state_json);
  Object.entries(playbook_state_obj).forEach(([playbook, obj]) => {
    let done_button = document.getElementById(playbook);
    if (done_button && playbook_state_obj[playbook].result === 0) {
      done_button.removeAttribute("disabled");
    } else if (done_button) {
      done_button.disabled = true;
    }
  });

  get_inventory_file_state();
}

function clear_playbook_file_entry(key) {
  let playbook_state_file_path =
    "/usr/share/cockpit/ceph-deploy/state/playbook_state.json";
  let playbook_state_json = null;
  let playbook_state_file = cockpit.file(playbook_state_file_path);
  let playbook_state_file_content = playbook_state_file.read();
  playbook_state_file_content.then((content, tag) => {
    if (content) {
      try {
        playbook_state_json = JSON.parse(content);
      } catch (error) {
        console.log(
          "clear_playbook_file_entry(): unable to parse playbook state file"
        );
      }
      if (playbook_state_json.hasOwnProperty(key)) {
        delete playbook_state_json[key];
        let updated_playbook_state_file_content = playbook_state_file.replace(
          JSON.stringify(playbook_state_json, null, 4)
        );
        updated_playbook_state_file_content.then((tag) => {
          playbook_state_file.close();
          setup_main_menu();
        });
        updated_playbook_state_file_content.catch((e) => {
          playbook_state_file.close();
          console.log(
            "clear_playbook_file_entry(): unable to update playbook state file"
          );
        });
      }
    }
  });
}

function clear_inventory_file_entry(key) {
  let inventory_state_file_path =
    "/usr/share/cockpit/ceph-deploy/state/inventory_state.json";
  let inv_state_json = null;
  let inv_state_file = cockpit.file(inventory_state_file_path);
  let inv_state_file_content = inv_state_file.read();
  inv_state_file_content.then((content, tag) => {
    if (content) {
      try {
        inv_state_json = JSON.parse(content);
      } catch (error) {
        console.log(
          "clear_inventory_file_entry(): unable to parse inventory state file"
        );
        document.getElementById("ansible-config-inv-nxt").disabled = true;
      }
      if (inv_state_json.hasOwnProperty(key)) {
        inv_state_json[key]["failed"] = true;
        let new_inv_state_file = inv_state_file.replace(
          JSON.stringify(inv_state_json, null, 4)
        );
        new_inv_state_file.then((tag) => {
          inv_state_file.close();
          update_localStorage_inv_file_requirements(key, "", false);
          reset_inventory_file_elements(key);
          get_inventory_file_state();
        });
        new_inv_state_file.catch((e) => {
          inv_state_file.close();
          console.log(
            "clear_inventory_file_entry(): unable to update inventory state file"
          );
        });
      }
    } else {
      document.getElementById("ansible-config-inv-nxt").disabled = true;
    }
  });
}

function reset_inventory_file_elements(key) {
  if (g_inventory_file_vars.hasOwnProperty(key)) {
    let file_content_div = document.getElementById(
      g_inventory_file_vars[key]["file_content_div_id"]
    );
    let show_button = document.getElementById(
      g_inventory_file_vars[key]["show_button_id"]
    );
    let generate_button = document.getElementById(
      g_inventory_file_vars[key]["generate_button_id"]
    );
    let default_content_div = document.getElementById(
      g_inventory_file_vars[key]["default_content_div"]
    );
    if (
      file_content_div &&
      show_button &&
      generate_button &&
      default_content_div
    ) {
      file_content_div.classList.add("hidden");
      show_button.removeEventListener(
        "click",
        g_inventory_file_vars[key]["show_listener"],
        false
      );
      show_button.classList.add("hidden");
      generate_button.innerHTML = "Generate";
      default_content_div.classList.remove("hidden");
      if (inventory_file_generation_completed_check()) {
        document
          .getElementById("ansible-config-inv-nxt")
          .removeAttribute("disabled");
      } else {
        document.getElementById("ansible-config-inv-nxt").disabled = true;
      }
    }
  }
}

function update_inventory_state_file(new_inv_state_json) {
  let inventory_state_file_path =
    "/usr/share/cockpit/ceph-deploy/state/inventory_state.json";
  let inv_state_json = null;
  let inv_state_file = cockpit.file(inventory_state_file_path);
  let inv_state_file_content = inv_state_file.read();
  inv_state_file_content.then((content, tag) => {
    if (content) {
      try {
        inv_state_json = JSON.parse(content);
      } catch (error) {
        console.log(
          "clear_inventory_file_entry(): unable to parse inventory state file"
        );
        document.getElementById("ansible-config-inv-nxt").disabled = true;
      }
      let new_inv_state_file = inv_state_file.replace(
        JSON.stringify(new_inv_state_json, null, 4)
      );
      new_inv_state_file.then((tag) => {
        inv_state_file.close();
      });
      new_inv_state_file.catch((e) => {
        inv_state_file.close();
        console.log(
          "clear_inventory_file_entry(): unable to update inventory state file"
        );
      });
    } else {
      document.getElementById("ansible-config-inv-nxt").disabled = true;
    }
  });
}

function get_inventory_file_state() {
  let inventory_state_file_path =
    "/usr/share/cockpit/ceph-deploy/state/inventory_state.json";
  let inv_state_json = null;
  let inv_state_file_content = cockpit.file(inventory_state_file_path).read();
  inv_state_file_content.then((content, tag) => {
    if (content) {
      try {
        inv_state_json = JSON.parse(content);
      } catch (error) {
        console.log(
          "get_inventory_state_file(): unable to parse inventory state file"
        );
        document.getElementById("ansible-config-inv-nxt").disabled = true;
      }

      Object.entries(g_inventory_file_vars).forEach(([key, obj]) => {
        if (
          inv_state_json.hasOwnProperty(key) &&
          inv_state_json[key].hasOwnProperty("failed") &&
          !inv_state_json[key]["failed"]
        ) {
          let ansible_inv_file = cockpit
            .file(inv_state_json[key]["path"])
            .read();
          ansible_inv_file.then((ainv_content, tag) => {
            if (ainv_content) {
              inv_state_json[key]["content"] = ainv_content;
              inv_state_json[key]["completed"] = true;
              let file_content_div = document.getElementById(
                obj["file_content_div_id"]
              );
              file_content_div.innerHTML = ainv_content;
              file_content_div.classList.remove("hidden");
              let show_button = document.getElementById(obj["show_button_id"]);
              show_button.addEventListener("click", obj["show_listener"]);
              show_button.classList.remove("hidden");
              show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
              document.getElementById(obj["generate_button_id"]).innerHTML =
                "Generate Again";
              document
                .getElementById(obj["default_content_div"])
                .classList.add("hidden");
              update_localStorage_inv_file_requirements(
                key,
                ainv_content,
                true
              );
              if (inventory_file_generation_completed_check()) {
                document
                  .getElementById("ansible-config-inv-nxt")
                  .removeAttribute("disabled");
              } else {
                document.getElementById(
                  "ansible-config-inv-nxt"
                ).disabled = true;
              }
            } else {
              document.getElementById("ansible-config-inv-nxt").disabled = true;
            }
          });
        } else if (
          inv_state_json.hasOwnProperty(key) &&
          inv_state_json[key].hasOwnProperty("failed") &&
          inv_state_json[key]["failed"]
        ) {
          inv_state_json[key]["content"] = "";
          inv_state_json[key]["completed"] = false;
        }
      });
    } else {
      document.getElementById("ansible-config-inv-nxt").disabled = true;
    }
  });
  //update local inventory file with updated content.
  if (inv_state_json) {
    localStorage.setItem(
      "inventory_state",
      JSON.stringify(inv_state_json, null, 4)
    );
    update_inventory_state_file(inv_state_json);
  }
}

function get_ceph_deploy_initial_state() {
  return new Promise((resolve, reject) => {
    let ceph_deploy_state_file = cockpit.file(
      "/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json"
    );
    initial_state = ceph_deploy_state_file.read();
    initial_state.then((content, tag) => {
      if (content) {
        let deploy_state_json = null;
        //defer to the state on the server as it is possible that more than one browser was used.
        try {
          deploy_state_json = JSON.parse(content);
        } catch (error) {
          console.log("unable to parse ceph_ceploy_state.json");
        }
        if (deploy_state_json) {
          //we have JSON formatted data in the local file.
          let update_local_file = false;
          Object.entries(deploy_state_json).forEach(([key, obj]) => {
            if (
              obj.hasOwnProperty("lock_state") &&
              obj["lock_state"] != "complete" &&
              g_ceph_deploy_default_state.hasOwnProperty(key) &&
              JSON.stringify(g_ceph_deploy_default_state[key]) !=
                JSON.stringify(obj)
            ) {
              // the default state should be the same as the default state from ceph-deploy.js, update local file.
              deploy_state_json[key] = g_ceph_deploy_default_state[key];
              update_local_file = true;
            }
          });
          if (update_local_file) {
            //we can update the locked steps with most up-to-date default state from ceph-deploy.js
            let update_state_file = ceph_deploy_state_file.replace(
              JSON.stringify(deploy_state_json)
            );
            update_state_file.then((tag) => {
              ceph_deploy_state_file.close();
              localStorage.setItem(
                "ceph_deploy_state",
                JSON.stringify(deploy_state_json, null, 4)
              );
              localStorage.removeItem("inventory_files");
              localStorage.removeItem("inventory_state");
              resolve();
            });
            update_state_file.catch((e) => {
              ceph_deploy_state_file.close();
              reject(
                "/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json could not be updated."
              );
            });
          } else {
            localStorage.setItem(
              "ceph_deploy_state",
              JSON.stringify(deploy_state_json, null, 4)
            );
            ceph_deploy_state_file.close();
            localStorage.removeItem("inventory_files");
            localStorage.removeItem("inventory_state");
            resolve();
          }
        }
      } else if (!content) {
        //file does not exist locally
        let create_state_file = ceph_deploy_state_file.replace(
          JSON.stringify(g_ceph_deploy_default_state)
        );
        create_state_file.then((tag) => {
          ceph_deploy_state_file.close();
          localStorage.setItem(
            "ceph_deploy_state",
            JSON.stringify(g_ceph_deploy_default_state, null, 4)
          );
          localStorage.removeItem("inventory_files");
          localStorage.removeItem("inventory_state");
          resolve();
        });
        create_state_file.catch((e) => {
          ceph_deploy_state_file.close();
          reject(
            "/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json could not be created."
          );
        });
      }
    });
  });
}

function get_playbook_initial_state() {
  return new Promise((resolve, reject) => {
    let playbook_state_file = cockpit.file(
      "/usr/share/cockpit/ceph-deploy/state/playbook_state.json"
    );
    initial_state = playbook_state_file.read();
    initial_state.then((content, tag) => {
      if (content) {
        let playbook_state_json = null;
        //defer to the state on the server as it is possible that more than one browser was used.
        try {
          playbook_state_json = JSON.parse(content);
        } catch (error) {
          console.log("unable to parse playbook_state.json");
        }
        if (playbook_state_json) {
          localStorage.setItem(
            "playbook_state",
            JSON.stringify(playbook_state_json, null, 4)
          );
          playbook_state_file.close();
          resolve();
        } else {
          let create_state_file = playbook_state_file.replace("{}");
          create_state_file.then((tag) => {
            playbook_state_file.close();
            localStorage.setItem("playbook_state", "{}");
            resolve();
          });
          create_state_file.catch((e) => {
            playbook_state_file.close();
            reject(
              "/usr/share/cockpit/ceph-deploy/state/playbook_state.json could not be created."
            );
          });
        }
      } else if (!content) {
        //file does not exist locally
        let create_state_file = playbook_state_file.replace("{}");
        create_state_file.then((tag) => {
          playbook_state_file.close();
          localStorage.setItem("playbook_state", "{}");
          resolve();
        });
        create_state_file.catch((e) => {
          playbook_state_file.close();
          reject(
            "/usr/share/cockpit/ceph-deploy/state/playbook_state.json could not be created."
          );
        });
      }
    });
  });
}

async function start_ceph_deploy() {
  try {
    await get_ceph_deploy_initial_state();
  } catch (e) {
    alert(e);
    console.error(e);
  }
  try {
    await get_playbook_initial_state();
  } catch (e) {
    alert(e);
    console.error(e);
  }
  setup_buttons();
  get_param_file_content();
  monitor_playbook_state_file();
}

function main() {
  let root_check = cockpit.permission({ admin: true });
  root_check.addEventListener("changed", function () {
    if (root_check.allowed) {
      //user is an administrator, start the module as normal
      //setup on-click listeners for buttons as required.
      start_ceph_deploy();
    } else {
      //user is not an administrator, block the page content.
      let page_content = document.getElementById("ceph-deploy-content");
      page_content.innerHTML = "";
      let user_msg = document.createElement("div");
      user_msg.className = "content_block_msg";
      user_msg.innerHTML = "You must be an administrator to use this feature.";
      page_content.appendChild(user_msg);
    }
  });
}

main();

cockpit.transport.wait(function () {});
