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
let g_option_scheme = {
	"mons":{
		"global": [
			{
				"option_name":"monitor_interface",
				"optional":false,
				"label":"monitor_interface",
				"feedback":true,
				"feedback_type":"name",
				"help":"",
				"input_type":"text",
				"default_value":""
			},
			{
				"option_name":"ip_version",
				"optional":false,
				"label":"ip_version",
				"feedback":true,
				"feedback_type":"choice",
				"feedback_choice_options":["ipv4","ipv6"],
				"help":"",
				"input_type":"text",
				"default_value":"ipv4"
			}
		],
		"unique": [
			{
				"option_name":"monitor_interface",
				"optional":true,
				"label":"monitor_interface",
				"feedback":true,
				"feedback_type":"name",
				"help":"",
				"input_type":"text",
				"default_value":""
			}
		]
	},
	"mgrs":{
		"global": [],
		"unique": []
	},
	"osds":{
		"global": [
			{
				"option_name":"public_network",
				"optional":false,
				"label":"public_network",
				"feedback":true,
				"feedback_type":"ip",
				"help":"",
				"input_type":"text",
				"default_value":""
			},
			{
				"option_name":"cluster_network",
				"optional":true,
				"label":"cluster_network",
				"feedback":true,
				"feedback_type":"ip",
				"help":"",
				"input_type":"text",
				"default_value":""
			},
			{
				"option_name":"hybrid_cluster",
				"optional":false,
				"label":"hybrid_cluster",
				"feedback":false,
				"help":"",
				"input_type":"checkbox",
				"default_value":false
			}
		],
		"unique": []
	},
	"metrics":{
		"global": [],
		"unique": []
	},
	"mdss":{
		"global": [],
		"unique": []
	},
	"smbs":{
		"global": [],
		"unique": []
	},
	"nfss":{
		"global": [],
		"unique": []
	},
	"iscsigws":{
		"global": [],
		"unique": []
	},
	"rgws":{
		"global": [
			{
				"option_name":"radosgw_civetweb_port",
				"optional":false,
				"label":"radosgw_civetweb_port",
				"feedback":true,
				"feedback_type":"num",
				"help":"",
				"input_type":"text",
				"default_value":"8080"
			},
			{
				"option_name":"radosgw_frontend_type",
				"optional":false,
				"label":"radosgw_frontend_type",
				"feedback":false,
				"help":"",
				"input_type":"text",
				"default_value":"beast"
			},
			{
				"option_name":"radosgw_civetweb_num_threads",
				"optional":false,
				"label":"radosgw_civetweb_num_threads",
				"feedback":true,
				"feedback_type":"num",
				"help":"",
				"input_type":"text",
				"default_value":"512"
			}
		],
		"unique": [
			{
				"option_name":"radosgw_address",
				"optional":false,
				"label":"radosgw_address",
				"feedback":true,
				"feedback_type":"ip",
				"help":"",
				"input_type":"text",
				"default_value":""
			}
		]
	},
	"rgwloadbalancers":{
		"global": [],
		"unique": []
	},
	"client":{
		"global": [],
		"unique": []
	}
}

let g_ceph_deploy_default_state = {
	"deploy-step-preconfig" : {
		"lock_state":"unlocked",
		"step_content_id":"step-preconfig",
		"progress":"0",
		"unlock_requirements": []
	},
	"deploy-step-ansible-config" : {
		"lock_state":"locked",
		"step_content_id":"step-ansible-config",
		"progress":"0",
		"unlock_requirements": ["deploy-step-preconfig"]
	},
	"deploy-step-core" : {
		"lock_state":"locked",
		"step_content_id":"step-core",
		"progress":"0",
		"unlock_requirements": ["deploy-step-ansible-config"]
	},
	"deploy-step-cephfs" : {
		"lock_state":"locked",
		"step_content_id":"step-cephfs",
		"progress":"0",
		"unlock_requirements": ["deploy-step-core"]
	},
	"deploy-step-nfs" : {
		"lock_state":"locked",
		"step_content_id":"step-nfs",
		"progress":"0",
		"unlock_requirements": ["deploy-step-cephfs"]
	},
	"deploy-step-smb" : {
		"lock_state":"locked",
		"step_content_id":"step-smb",
		"progress":"0",
		"unlock_requirements": ["deploy-step-cephfs"]
	},
	"deploy-step-rgw" : {
		"lock_state":"locked",
		"step_content_id":"step-rgw",
		"progress":"0",
		"unlock_requirements": ["deploy-step-core"]
	},
	"deploy-step-rgwlb" : {
		"lock_state":"locked",
		"step_content_id":"step-rgwlb",
		"progress":"0",
		"unlock_requirements": ["deploy-step-rgw"]
	},
	"deploy-step-iscsi" : {
		"lock_state":"locked",
		"step_content_id":"step-iscsi",
		"progress":"0",
		"unlock_requirements": ["deploy-step-core"]
	},
	"deploy-step-dashboard" : {
		"lock_state": "locked",
		"step_content_id":"step-dashboard",
		"progress":"0",
		"unlock_requirements": ["deploy-step-rgw","deploy-step-iscsi","deploy-step-nfs","deploy-step-smb"]
	}
};

/**
 * Display a short message at the bottom of the screen.
 * @param {string} msg_label 
 * @param {string} msg_content 
 * @param {string} msg_color 
 * @param {string} id 
 */
function show_snackbar_msg(msg_label,msg_content,msg_color,id) {
	var snackbar = document.getElementById(id);
	if(snackbar != null){
		snackbar.innerHTML = msg_label + msg_content;
		snackbar.style.backgroundColor = msg_color;
		snackbar.className = "show";
		setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 5000);
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
function add_host_request(){
	let hostname = document.getElementById("new-hostname-field").value;
	let monitor_interface = document.getElementById("new-interface-field").value;
	if(hostname != null && hostname != ""){
		host_request_json = {[hostname]:{"hostname":""}};
		host_request_json[hostname]["hostname"] = hostname;
		host_request_json[hostname]["monitor_interface"] = (monitor_interface != null) ? monitor_interface:"";
		var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-h",JSON.stringify(host_request_json),"-w"];
		var result_json = null;
		var proc = cockpit.spawn(spawn_args, {superuser: "require"});
		proc.done(function(data) {
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
			if (result_json.hasOwnProperty("success_msg")){
				msg_color = "#20a030";
				msg_label = "Add Host: ";
				msg_content = "Host Added Succcessfully.";
			}else{
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			hide_modal_dialog("add-host-modal");
			get_param_file_content();
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
		proc.fail(function(ex, data) {
			document.getElementById("add-host-result-msg").style.display = "block";
			var msg_label = document.getElementById("add-host-result-msg-label");
			msg_label.innerHTML = "Error:";
			var msg_content = document.getElementById("add-host-result-msg-content");
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_content.innerHTML = "Unable to add host";
			}
			if (result_json.hasOwnProperty("error_msg")){
				msg_content.innerHTML = result_json.error_msg;
			}else{
				msg_content.innerHTML = "Unable to add host";
			}
		});
	}
}

/**
 * shows the add-host-modal dialog window.
 */
function add_host(){
	document.getElementById("add-host-modal-title").innerText = "Add New Host";
	
	let hostname_field = document.getElementById("new-hostname-field");
	let interface_field = document.getElementById("new-interface-field");
	hostname_field.value = "";
	interface_field.value = "";

    show_modal_dialog("add-host-modal");
	hostname_field.addEventListener("input",function(){
		check_name_field("new-hostname-field","new-hostname-field-feedback","continue-add-host","hostname",true)});
	interface_field.addEventListener("input",function(){
		check_name_field("new-interface-field","new-interface-field-feedback","continue-add-host","monitor_interface",false)});
    document.getElementById("close-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("cancel-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("continue-add-host").addEventListener("click",add_host_request);
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
function check_name_field(name_field_id,feedback_field_id,button_id,label_name,required_flag) {
	var field_text = document.getElementById(name_field_id).value;
	var button = document.getElementById(button_id);
	var info_message = document.getElementById(feedback_field_id);
	info_message.innerText = " ";
	if(field_text.length === 0 && required_flag){
		button.disabled = true;
		info_message.innerText = label_name + " cannot be empty.";
		return false;
	}else if(field_text.length > 0 && !field_text.match(/^[a-z_][a-z0-9_-]*[$]?$/)){
		button.disabled = true;
		var invalid_chars = [];
		if(field_text[0].match(/[^a-z_]/))
			invalid_chars.push("'"+field_text[0]+"'");
		for(let char of field_text.slice(1,-1))
			if(char.match(/[^a-z0-9_-]/))
				invalid_chars.push("'"+char+"'");
		if(field_text[field_text.length - 1].match(/[^a-z0-9_\-$]/))
			invalid_chars.push("'"+field_text[field_text.length - 1]+"'");
		info_message.innerText = label_name + " contains invalid characters: \n" + invalid_chars.join(", ");
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
function check_ip_field(field_id,feedback_field_id,button_id,label_name,required_flag) {
	var ip_string = document.getElementById(field_id).value;
	var button = document.getElementById(button_id);
	var info_message = document.getElementById(feedback_field_id);
	info_message.innerText = " ";
	if(ip_string.length === 0 && required_flag){
		button.disabled = true;
		info_message.innerText = label_name + " cannot be empty.";
		return false;
	}else if(ip_string.length > 0 && !validate_ip_address(ip_string)){
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
	let ipv6 = /^((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}))|:)))(%.+)?((\/){1}(1?2?[0-8]|1?[0-1][0-9]|[1-9]?[0-9]))?\s*$/.test(ipaddress);
	let ipv4 = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)((\/){1}([1-2]?[0-9]|3[0-2]))?$/.test(ipaddress);
	return (ipv4 || ipv6)
}  

/**
 * displays the modal dialog window with the provided id.
 * @param {string} id 
 */
function show_modal_dialog(id){
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
function update_role_info(hosts_json,roles_json){
	//clear out the role-div element
	let role_div = document.getElementById("role-div");
	if(role_div != null){role_div.innerHTML = "";}

	//create the new role table
	let role_table = document.createElement("table");
	role_table.classList.add("role-table");
	role_table.id = "role-table";

	//create a blank th entry to start then create a header for each role
	let role_table_header_row = document.createElement("tr");
	role_table_header_row.classList.add("cd-table-header-row");
	role_table_header_row.appendChild(document.createElement("th"));
	for (let key of Object.keys(roles_json)){
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
		for (let role_key of Object.keys(roles_json)){
			//create a cell and checkbox for each role.
			let role_checkbox_td = document.createElement("td");
			let role_checkbox = document.createElement("input");
			role_checkbox.type = "checkbox";
			role_checkbox.classList.add("cd-checkbox");
			role_checkbox.id = role_key + "-" + host_key + "-checkbox"; //eg "osds-hostname1-checkbox"
			if(roles_json[role_key].includes(host_key)){
				// ensure that checkbox is pre-checked if hostname is found in role list.
				role_checkbox.checked = true; 
			}
			role_checkbox.addEventListener("change",function(){
			document.getElementById("update-roles-btn").removeAttribute("disabled")});
			role_checkbox_td.appendChild(role_checkbox);
			role_table_host_row.appendChild(role_checkbox_td);
		}
		role_table.appendChild(role_table_host_row); // add row to table
	}
	role_div.appendChild(role_table); // add table to div
	document.getElementById("update-roles-btn").disabled = true; // diable the update roles button
	let role_content = document.getElementById("role-content");
	let placeholder = document.getElementById("cd-role-placeholder");
	if(role_content && placeholder){
		if(role_table.getElementsByTagName('tr').length === 1){ 
			role_content.classList.add("hidden");
			placeholder.classList.remove("hidden");
		}
		else{
			role_content.classList.remove("hidden");
			placeholder.classList.add("hidden");
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
 */
function update_options_info(hosts_json, roles_json, options_json){
	let options_div = document.getElementById("ansible-config-options");
	if(options_div){
		options_div.innerHTML = ""; //erase everything within the options div.
		//create global and per-host options for each role type
		Object.entries(roles_json).forEach(([role, host_list]) => {
			//loop through each role in the roles_json
			if(host_list.length > 0 && g_option_scheme[role].global.length > 0){
				// At least one host is assigned this role

				//create a box to house all global and per-host options
				let role_option_div = document.createElement("div");
				role_option_div.classList.add("panel","panel-default","cd-option-panel");

				let section_header = document.createElement("div");
				section_header.classList.add("cd-row", "cd-panel-heading");
				
				let section_header_text = document.createElement("h3");
				section_header_text.classList.add("panel-title", "cd-row-child");
				section_header_text.innerText = "Options [" + role + "]: ";
				section_header.appendChild(section_header_text);

				let section_body = document.createElement("div");
				section_body.classList.add("cd-panel-body");

				let global_option_p = document.createElement("p");
				global_option_p.classList.add("cd-para");
				global_option_p.innerText = "Global Options: ";
				section_body.appendChild(global_option_p);

				let global_form = document.createElement("div");
				global_form.classList.add("ct-form");
				global_form.id = role;
				
				for(let opt of g_option_scheme[role].global){
					// loop through each option in the option scheme and create fields
					// for each global option.
					let opt_wrapper = document.createElement("div");
					opt_wrapper.classList.add("ct-validation-wrapper");

					let opt_label = document.createElement("label");
					opt_label.classList.add("control-label");
					opt_label.setAttribute("for",opt.option_name);
					opt_label.innerText = (opt.optional ? "" : "* ") + opt.option_name;
					global_form.appendChild(opt_label);

					let opt_input = document.createElement("input");
					if(opt.input_type === "text"){
						// make a text field
						opt_input.type = opt.input_type;
						opt_input.classList.add("ct-input","cd-field");
						opt_input.value = (
							(options_json.hasOwnProperty(opt.option_name) && 
							(options_json[opt.option_name] != ""))?options_json[opt.option_name]:opt.default_value);
					}else if(opt.input_type === "checkbox"){
						// make a checkbox
						opt_input.type = opt.input_type;
						opt_input.classList.add("ct-input","cd-field-checkbox");
						opt_input.checked = (
							options_json.hasOwnProperty(opt.option_name)?options_json[opt.option_name]:false);
						opt_input.addEventListener("change",function(){
							document.getElementById("global-options-btn").removeAttribute("disabled")});
					}
					opt_input.setAttribute("aria-invalid","false");
					opt_input.id = opt.option_name;
					opt_input.setAttribute("global-option",true);
					opt_input.setAttribute("optional",opt.optional);

					opt_wrapper.appendChild(opt_input);

					if(opt.feedback){
						let feedback = document.createElement("div");
						feedback.classList.add("cd-field-feedback");
						feedback.id = opt.option_name + "-feedback";

						if(opt.feedback_type === "ip"){
							opt_input.addEventListener("input",function(){
								check_ip_field(
									opt.option_name,
									opt.option_name + "-feedback",
									"global-options-btn",
									opt.option_name,
									!opt.optional)
								}
							);
						}else if(opt.feedback_type === "name"){
							opt_input.addEventListener("input",function(){
								check_name_field(
									opt.option_name,
									opt.option_name + "-feedback",
									"global-options-btn",
									opt.option_name,
									!opt.optional)
								}
							);

						}else if(opt.feedback_type === "num"){
							//todo: ADD num listener
							console.log("num");
						}
						else if(opt.feedback_type === "choice"){
							//todo: ADD CHOICE LISTENER
							console.log("choice");
						}

						opt_wrapper.appendChild(feedback);
					}
					global_form.appendChild(opt_wrapper);
					section_body.appendChild(global_form);
				}

				// per-host options
				if(host_list.length > 0 && g_option_scheme[role].unique.length > 0){
					let unique_option_p = document.createElement("p");
					unique_option_p.classList.add("cd-para");
					unique_option_p.innerText = "Per-host Options: ";
					section_body.appendChild(unique_option_p);

					for(let i = 0; i < host_list.length; i++){
						let host_option_div = document.createElement("div");
						host_option_div.classList.add("panel","panel-default","cd-option-panel");

						let host_option_panel_heading = document.createElement("div");
						host_option_panel_heading.classList.add("cd-row", "cd-panel-heading");
						host_option_panel_heading.innerText = host_list[i];

						let host_option_panel_body = document.createElement("div");
						host_option_panel_body.classList.add("cd-panel-body");

						let host_form = document.createElement("div");
						host_form.classList.add("ct-form");

						for(let opt of g_option_scheme[role].unique){
							let opt_wrapper = document.createElement("div");
							opt_wrapper.classList.add("ct-validation-wrapper");
						
							let opt_label = document.createElement("label");
							opt_label.classList.add("control-label");
							opt_label.setAttribute("for",opt.option_name + "-" + host_list[i]);
							opt_label.innerText = (opt.optional ? "" : "* ") + opt.option_name;
							host_form.appendChild(opt_label);
						
							let opt_input = document.createElement("input");
							if(opt.input_type === "text"){
								opt_input.type = opt.input_type;
								opt_input.classList.add("ct-input","cd-field");
								opt_input.value =(hosts_json[host_list[i]].hasOwnProperty(opt.option_name)?hosts_json[host_list[i]][opt.option_name]:opt.default_value);
							}else if(opt.input_type === "checkbox"){
								opt_input.type = opt.input_type;
								opt_input.classList.add("ct-input","cd-field-checkbox");
								opt_input.addEventListener("change",function(){
									document.getElementById("global-options-btn").removeAttribute("disabled")});
							}
							opt_input.setAttribute("aria-invalid","false");
							opt_input.id = opt.option_name + "-" + host_list[i];
							opt_input.setAttribute("hostname",host_list[i]);
							opt_input.setAttribute("field",opt.option_name);
							opt_input.setAttribute("optional",opt.optional);
							opt_input.setAttribute("global-option",false);
						
							opt_wrapper.appendChild(opt_input);
						
							if(opt.feedback){
								let feedback = document.createElement("div");
								feedback.classList.add("cd-field-feedback");
								feedback.id = opt.option_name + "-" + host_list[i] + "-feedback";
							
								if(opt.feedback_type === "ip"){
									opt_input.addEventListener("input",function(){
										check_ip_field(
											opt.option_name + "-" + host_list[i],
											opt.option_name + "-" + host_list[i] + "-feedback",
											"global-options-btn",
											opt.option_name,
											!opt.optional)
										}
									);
								}else if(opt.feedback_type === "name"){
									opt_input.addEventListener("input",function(){
										check_name_field(
											opt.option_name + "-" + host_list[i],
											opt.option_name + "-" + host_list[i] + "-feedback",
											"global-options-btn",
											opt.option_name,
											!opt.optional)
										}
									);
									
								}else if(opt.feedback_type === "num"){
									//todo: ADD num listener
									console.log("num");
								}
								else if(opt.feedback_type === "choice"){
									//todo: ADD CHOICE LISTENER
									console.log("choice");
								}
							
								opt_wrapper.appendChild(feedback);
							}
							host_form.appendChild(opt_wrapper);
						}
						host_option_panel_body.appendChild(host_form);
						host_option_div.appendChild(host_option_panel_heading);
						host_option_div.appendChild(host_option_panel_body);
						section_body.appendChild(host_option_div);
					}
				}
				role_option_div.appendChild(section_header);
				role_option_div.appendChild(section_body);
				options_div.appendChild(role_option_div);
			}
		});
	}

	document.getElementById("global-options-btn").disabled = true;
	let per_host_list = options_div.querySelectorAll(':scope input[global-option="false"]');
	console.log("per_host_list: ",per_host_list);

	let global_list = options_div.querySelectorAll(':scope input[global-option="true"]');
	console.log("global_list: ",global_list);
	
	let required_list = options_div.querySelectorAll(':scope input[optional="false"]');
	console.log("required_list: ",required_list);

	let next_btn = document.getElementById("ansible-config-add-options-nxt");
	next_btn.removeAttribute("disabled");
	required_list.forEach(element => {
		if(element.value == ""){
			next_btn.disabled = true;
			next_btn.title = "To proceed, fill in required fields.";
		}
	});

}

/**
 * uses the core_params helper script. The -s option provided will output json to 
 * stdout. This will then update the hosts, roles and options using the current json.
 */
function get_param_file_content(){
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-s"];
	var result_json = null;
	var proc = cockpit.spawn(spawn_args, {superuser: "require"});
	proc.done(function(data) {
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
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			if(result_json.hasOwnProperty("old_file_content")){
				update_host_info(result_json.old_file_content.hosts);
				update_role_info(result_json.old_file_content.hosts, result_json.old_file_content.roles);
				update_options_info(result_json.old_file_content.hosts, result_json.old_file_content.roles,result_json.old_file_content.options);
			}
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		hide_modal_dialog("add-host-modal");
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
	proc.fail(function(ex, data) {
		var msg_color = "#bd3030";
		var msg_label = "Error:";
		var msg_content = "Unable to load parameter file.";
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
}

/**
 * uses core_params helper script with the -x option to remove the host with 
 * the hostname of the provided string from /usr/share/cockpit/ceph-deploy/params/core_params.json.
 * @param {string} hostname 
 */
function remove_host(hostname){
	host_request_json = {[hostname]:{"hostname":{}}};
		host_request_json[hostname]["hostname"] = hostname;
		var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-h",JSON.stringify(host_request_json),"-x"];
		var result_json = null;
		var proc = cockpit.spawn(spawn_args, {superuser: "require"});
		proc.done(function(data) {
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
			if (result_json.hasOwnProperty("success_msg")){
				msg_color = "#20a030";
				msg_label = "Remove Host: ";
				msg_content = result_json.success_msg;
			}else{
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			get_param_file_content();
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
		proc.fail(function(ex, data) {
			var msg_label = "Error: ";
			var msg_content = ""
			var msg_color = "#bd3030";
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_content = "Unable to remove host";
			}
			if (result_json.hasOwnProperty("error_msg")){
				msg_content = result_json.error_msg;
			}else{
				msg_content = "Unable to remove host";
			}
			show_snackbar_msg(msg_label,msg_content,msg_color,"add-host-snackbar");
		});
}

/**
 * shows the add-host-modal dialog, with the editable fields populated with
 * the hostname and monitor_interface strings.
 * @param {string} hostname 
 * @param {string} monitor_interface 
 */
function edit_host(hostname,monitor_interface){
	document.getElementById("add-host-modal-title").innerText = "Edit Host";
	
	let hostname_field = document.getElementById("new-hostname-field");
	let interface_field = document.getElementById("new-interface-field");
	
	hostname_field.value = hostname;
	interface_field.value = monitor_interface;

	show_modal_dialog("add-host-modal");
	hostname_field.addEventListener("input",function(){
		check_name_field("new-hostname-field","new-hostname-field-feedback","continue-add-host","hostname",true)});
	interface_field.addEventListener("input",function(){
		check_name_field("new-interface-field","new-interface-field-feedback","continue-add-host","monitor_interface",false)});

	document.getElementById("close-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
	document.getElementById("cancel-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
	document.getElementById("continue-add-host").addEventListener("click",add_host_request);
	document.getElementById("continue-add-host").innerText = "Save";
}

/**
 * updates the list of hosts using the json provided. if the host list is empty, progress
 * is forbidden by disabling the next button. It will also enable the button if
 * the list is not empty. 
 * @param {Object} hosts_json 
 */
function update_host_info(hosts_json){
	let host_list = document.getElementById("cd-host-list");
	while (host_list.hasChildNodes()) {  
		host_list.removeChild(host_list.firstChild);
	}
	if(Object.keys(hosts_json).length > 0){
		document.getElementById("ansible-config-hosts-and-roles-nxt").removeAttribute("disabled");
		document.getElementById("cd-host-box").classList.remove("hidden");
		document.getElementById("cd-host-placeholder").classList.add("hidden");
		for (let key of Object.keys(hosts_json)) {
			let hostname = hosts_json[key]["hostname"];
			let monitor_interface = hosts_json[key]["monitor_interface"];
			
			var new_host_entry = document.createElement("div");
			new_host_entry.classList.add("cd-host-list-entry");

			var host_entry_hostname = document.createElement("div");
			host_entry_hostname.classList.add("cd-host-list-entry-text");
			host_entry_hostname.innerText = hostname;

			var host_entry_monitor_interface = document.createElement("div");
			host_entry_monitor_interface.classList.add("cd-host-list-entry-text");
			host_entry_monitor_interface.innerText = monitor_interface;

			var host_entry_edit_icon = document.createElement("div");
			host_entry_edit_icon.classList.add("cd-host-list-entry-icon","fa","fa-gear");

			host_entry_edit_icon.addEventListener("click", function(){
				let hns = hostname.valueOf();
				let mis = monitor_interface.valueOf();
				edit_host(hns,mis);
			});

			var host_entry_delete_icon = document.createElement("div");
			host_entry_delete_icon.classList.add("cd-host-list-entry-icon-del","fa","fa-times");
			host_entry_delete_icon.addEventListener("click", function(){let arg = hostname.valueOf();remove_host(arg)});

			new_host_entry.appendChild(host_entry_hostname);
			new_host_entry.appendChild(host_entry_monitor_interface);
			new_host_entry.appendChild(host_entry_edit_icon);
			new_host_entry.appendChild(host_entry_delete_icon);

			host_list.appendChild(new_host_entry);
		}
	}else{
		document.getElementById("cd-host-box").classList.add("hidden");
		document.getElementById("cd-host-placeholder").classList.remove("hidden");
		document.getElementById("ansible-config-hosts-and-roles-nxt").disabled = true;
	}
}

/**
 * using the state of the checkboxes, use the core_params helper script
 * to update /usr/share/cockpit/ceph-deploy/params/core_params.json
 */
function update_role_request(){
	// we can update the roles assigned to each host by performing two subsequent requests.
	// we can remove any unchecked roles first, then we can add in all of the checked roles.

	let role_request_template = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	let add_role_request_json = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	let remove_role_request_json = {
        "mons": [],
        "mgrs": [],
        "osds": [],
        "metrics": [],
        "mdss": [],
        "smbs": [],
        "nfss": [],
        "iscsigws": [],
        "rgws": [],
        "rgwloadbalancers": [],
        "client": []
	}

	//look through the role table and determine the state of each checkbox. 
	let role_table_host_rows = document.getElementsByClassName("role-table-host-row");
	for(let i = 0; i<role_table_host_rows.length; i++){
		// get the hostname from the id string of the tr element.
		let hostname = role_table_host_rows[i].id.substring("role-table-host-row-".length);
		for (let role_key of Object.keys(role_request_template)) {
			//construct the id string of the checkbox: example "mons-hostname1-checkbox"
			let checkbox_id_string = role_key + "-" + hostname + "-checkbox";
			let role_checkbox = document.getElementById(checkbox_id_string);
			if(role_checkbox != null){
				if(role_checkbox.checked){
					// The checkbox is checked, add the hostname to the add_role_request
					add_role_request_json[role_key].push(hostname);
				}else{
					// The checkbox is not checked, add the hostname to the remove_role_request
					remove_role_request_json[role_key].push(hostname);
				}
			}
		}
	}

	// perform the remove request first
	var remove_spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-r",JSON.stringify(remove_role_request_json),"-x"];
	var remove_result_json = null;
	var remove_role_proc = cockpit.spawn(remove_spawn_args, {superuser: "require"});
	remove_role_proc.done(function(data) {
		// removal was successful, now perform the add role request.
		var add_spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-r",JSON.stringify(add_role_request_json),"-w"];
		var add_result_json = null;
		var add_role_proc = cockpit.spawn(add_spawn_args, {superuser: "require"});
		add_role_proc.done(function(data) {
			show_snackbar_msg("Message: ","Roles have been updated.", "#20a030","update-roles-snackbar");
			get_param_file_content();
		});
		add_role_proc.fail(function(ex, data) {
			console.log("add_role_proc (FAIL): ",data);
			show_snackbar_msg("Error: ","Failed to add role(s)","#bd3030","update-roles-snackbar");
		});
	});
	remove_role_proc.fail(function(ex, data) {
		console.log("remove_role_proc (FAIL): ",data);
		show_snackbar_msg("Error: ","Failed to remove role(s)","#bd3030","update-roles-snackbar");
	});
}

/**
 * use the core_params helper script to update the options in /usr/share/cockpit/ceph-deploy/params/core_params.json
 * using the content of the option field elements. 
 */
function update_options_request(){
	let options_request_json = {
		"monitor_interface": document.getElementById("monitor_interface").value,
		"cluster_network": document.getElementById("cluster_network").value,
		"public_network": document.getElementById("public_network").value,
		"ip_version": document.getElementById("ip_version").value,
		"hybrid_cluster": document.getElementById("hybrid_cluster").checked
	};

	Object.entries(g_option_scheme).forEach(([role]) => {
		//TODO: CONTINUE FROM HERE TOMORROW>>>> 
	});

	if (options_request_json["hybrid_cluster"] === null){options_request_json["hybrid_cluster"] = false;}
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-o",JSON.stringify(options_request_json),"-w"];
	var result_json = null;
	var options_proc = cockpit.spawn(spawn_args, {superuser: "require"});
	options_proc.done(function(data){
		show_snackbar_msg("Message: ","Global options have been updated", "#20a030","update-options-snackbar");
		get_param_file_content();
	});
	options_proc.fail(function(ex, data) {
		console.log("options_proc (FAIL): ",data);
		show_snackbar_msg("Error: ","Failed to modify global options","#bd3030","update-roles-snackbar");
	});
}

/**
 * hides/unhides the all-file-content div, and updates the icon on the show button.
 */
function show_all_file(){
	let all_file_content = document.getElementById("all-file-content");
	let show_button = document.getElementById("show-all-file-btn");
	if(all_file_content && all_file_content.classList.contains("hidden")){
		all_file_content.classList.remove("hidden");
		show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
	}else{
		all_file_content.classList.add("hidden");
		show_button.innerHTML = '<i class="fas fa-eye"></i>';
	}
}

/**
 * hides/unhides the host-file-content div, and updates the icon on the show button.
 */
function show_host_file(){
	let host_file_content = document.getElementById("host-file-content");
	let show_button = document.getElementById("show-host-file-btn");
	if(host_file_content && host_file_content.classList.contains("hidden")){
		host_file_content.classList.remove("hidden");
		show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
	}else{
		host_file_content.classList.add("hidden");
		show_button.innerHTML = '<i class="fas fa-eye"></i>';
	}
}

/**
 * uses the make_hosts helper script to create /usr/share/ceph-ansible/hosts.
 * This will use the core_params.json file to create this.
 */
function generate_host_file(){
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_hosts"];
	var result_json = null;
	var generate_host_file_proc = cockpit.spawn(spawn_args, {superuser: "require"});
	generate_host_file_proc.done(function(data){
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
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			var host_file_content_proc = cockpit.spawn(["cat",result_json.path],{superuser:"require"});
			host_file_content_proc.done(function(data){
				document.getElementById("host-file-content").innerText = data;
				document.getElementById("host-file-content").classList.remove("hidden");
				localStorage.setItem("hosts",data);
				let show_button = document.getElementById("show-host-file-btn");
				show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
				show_button.classList.remove("hidden");
				show_button.addEventListener("click",show_host_file);
				document.getElementById("generate-host-file-btn").innerHTML = "Generate Again";
				document.getElementById("inv-file-hosts-default").classList.add("hidden");
				document.getElementById("ansible-config-inv-hosts-nxt").removeAttribute("disabled");
			});
			host_file_content_proc.fail(function(ex,data){
				console.log("host_file_content_proc (FAIL): ",data);
			});
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
}

/**
 * uses the make_all helper script to create /usr/share/ceph-ansible/group_vars/all.yml
 */
function generate_all_file(){
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/make_all"];
	var result_json = null;
	var generate_all_file_proc = cockpit.spawn(spawn_args, {superuser: "require"});
	generate_all_file_proc.done(function(data){
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
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			var all_file_content_proc = cockpit.spawn(["cat",result_json.path],{superuser:"require"});
			all_file_content_proc.done(function(data){
				document.getElementById("all-file-content").innerText = data;
				document.getElementById("all-file-content").classList.remove("hidden");
				localStorage.setItem("all.yml",data);
				let show_button = document.getElementById("show-all-file-btn");
				show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
				show_button.classList.remove("hidden");
				show_button.addEventListener("click",show_all_file);
				document.getElementById("generate-all-file-btn").innerHTML = "Generate Again";
				document.getElementById("inv-file-all-default").classList.add("hidden");
				document.getElementById("ansible-config-inv-all-nxt").removeAttribute("disabled");

			});
			all_file_content_proc.fail(function(ex,data){
				console.log("all_file_content_proc (FAIL): ",data);
			});
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		show_snackbar_msg(msg_label,msg_content,msg_color,"snackbar");
	});
}

/**
 * creates an iframe which uses terminal.html. This in turn will
 * use a modified version of terminal.js that will get "terminal-command"
 * from local storage and run it when it starts.
 * @param {string} termID 
 * @returns 
 */
function makeTerminal(termID){
	let term = document.createElement("iframe");
	term.setAttribute("width","100%");
	term.setAttribute("height","500px");
	term.id=termID;
	term.title="Terminal";
	term.src="terminal.html";
	return term;
}

/**
 * update the playbook_state local storage with content from
 * /usr/share/cockpit/ceph-deploy/state/playbook_state.json and enable the 
 * corresponding html element (button) with id==key. to allow for progression
 * within the module. 
 * @param {Object} content 
 */
function update_playbook_state(content){
	let prev_state_json_str = (localStorage.getItem("playbook_state")??"{}");
	let prev_state_json = JSON.parse(prev_state_json_str);
	if(content && prev_state_json != content){
		localStorage.setItem("playbook_state",JSON.stringify(content));
		Object.entries(content).forEach(([playbook, obj]) => {
			let target_button = document.getElementById(playbook);
			if(target_button && content.hasOwnProperty(playbook) && content[playbook].result === 0){
				target_button.removeAttribute("disabled");
				if(!prev_state_json.hasOwnProperty(playbook) || 
					(prev_state_json.hasOwnProperty(playbook) && 
					prev_state_json[playbook].time_stamp != content[playbook].time_stamp)){
					show_snackbar_msg("Playbook ("+playbook+"): ","Completed Successfully","#20a030","snackbar");
				}
			}else if (target_button && content.hasOwnProperty(playbook)){
				target_button.disabled = true;
				if(!prev_state_json.hasOwnProperty(playbook) || 
					(prev_state_json.hasOwnProperty(playbook) && 
					prev_state_json[playbook].time_stamp != content[playbook].time_stamp)){
					show_snackbar_msg("Playbook ("+playbook+"):","Unsuccessful","#bd3030","snackbar");
				}
			}
		});
	}
}

/**
 * watch the file /usr/share/cockpit/ceph-deploy/state/playbook_state.json
 * for changes and trigger update_playbook_state when the file is accessed.
 */
function monitor_playbook_state_file(){
	g_deploy_file = cockpit.file("/usr/share/cockpit/ceph-deploy/state/playbook_state.json", { syntax: JSON });
	g_deploy_file.watch(function(content){update_playbook_state(content);});
}

/**
 * set the terminal-command value in local storage and spawn a new
 * terminal within the appropriate iframe. 
 */
function ansible_ping(){
	localStorage.setItem("terminal-command","ansible_runner -c ping_all\n");
	let ping_term = document.getElementById("terminal-ping");
	if(!ping_term){ping_term = makeTerminal("terminal-ping");}
	document.getElementById("terminal-ping-iframe").appendChild(ping_term);
}

/**
 * perform the device_alias playbook within a new terminal. 
 */
function ansible_device_alias(){
	localStorage.setItem("terminal-command","ansible_runner -c device_alias\n");
	let device_alias_term = document.getElementById("terminal-device-alias");
	if(!device_alias_term){device_alias_term = makeTerminal("terminal-device-alias");}
	document.getElementById("terminal-device-alias-iframe").appendChild(device_alias_term);
}

/**
 * perform the deploy_core playbook within a new terminal. 
 */
function ansible_core(){
	localStorage.setItem("terminal-command","ansible_runner -c deploy_core\n");
	let core_term = document.getElementById("terminal-core");
	if(!core_term){core_term = makeTerminal("terminal-core");}
	document.getElementById("terminal-core-iframe").appendChild(core_term);
}

/**
 * perform the deploy_cephfs playbook within a new terminal. 
 */
 function ansible_cephfs(){
	localStorage.setItem("terminal-command","ansible_runner -c deploy_cephfs\n");
	let cephfs_term = document.getElementById("terminal-cephfs");
	if(!cephfs_term){cephfs_term = makeTerminal("terminal-cephfs");}
	document.getElementById("terminal-cephfs-iframe").appendChild(cephfs_term);
}

/**
 * toggle the visibility of the panel body and icon of the button
 * corresponding to pb_id and btn_id respectively.
 * @param {string} btn_id 
 * @param {string} pb_id 
 */
function toggle_panel_body_visibility(btn_id,pb_id){
	let pb = document.getElementById(pb_id);
	let btn = document.getElementById(btn_id);
	if(pb && btn){
		if(pb.classList.contains("hidden")){
			pb.classList.remove("hidden");
			btn.classList.remove("fa-angle-down");
			btn.classList.add("fa-angle-up");
		}else{
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
function setup_panel_vis_toggle_buttons(){
	let vis_toggle_buttons = document.getElementsByClassName("cd-panel-vis-toggle");
	for(let i=0; i<vis_toggle_buttons.length; i++){
		let target_content_id = vis_toggle_buttons[i].getAttribute("for");
		let target_content_obj = document.getElementById(target_content_id);
		let btn_id = vis_toggle_buttons[i].id;
		if(target_content_id && target_content_obj && btn_id){
			vis_toggle_buttons[i].addEventListener(
				"click",() => {toggle_panel_body_visibility(btn_id,target_content_id);});
		}
	}
}

/**
 * set up event listeners for each module's start button (found in main menu).
 */
function setup_deploy_step_start_buttons(){
	let start_buttons = document.getElementsByClassName("cd-deploy-step-start-btn");
	for(let i = 0; i < start_buttons.length; i++){
		let target_div = start_buttons[i].getAttribute("for");
		start_buttons[i].addEventListener("click",()=>{
			document.getElementById("cd-main-menu").classList.add("hidden");
			document.getElementById(target_div).classList.remove("hidden");
		});
	}
}

/**
 * 
 */
function setup_main_menu_links(){
	let main_menu_links = document.getElementsByClassName("progress-bar-main-back");
	if(main_menu_links){
		for(let i = 0; i < main_menu_links.length; i++){
			main_menu_links[i].addEventListener("click",()=>{
				let ceph_deploy_state = JSON.parse(localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
				Object.entries(ceph_deploy_state).forEach(([deploy_step_id, obj]) => {
					let content = document.getElementById(obj.step_content_id);
					if(content){
						content.classList.add("hidden");
					}
				});

				let main_menu_content = document.getElementById("cd-main-menu");
				if(main_menu_content){main_menu_content.classList.remove("hidden");}
			});
		}
	}
}

/**
 * configure all prev, next and done buttons for each deploy-step with default behavior. 
 */
function setup_deploy_step_nav_buttons(){

	let done_buttons = document.getElementsByClassName("cd-deploy-step-done-btn");
	if(done_buttons){
		for(let i = 0; i < done_buttons.length; i++){
			let step_content_id = done_buttons[i].getAttribute("for");
			if(step_content_id){
				let step_content = document.getElementById(step_content_id);
				if(step_content){
					let deploy_step_id = step_content.getAttribute("for");
					if(deploy_step_id){
						done_buttons[i].addEventListener("click", () => {
							let deploy_state = JSON.parse(localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
							deploy_state[deploy_step_id].lock_state = "complete";
							localStorage.setItem("ceph_deploy_state",JSON.stringify(deploy_state));
							sync_ceph_deploy_state();
							step_content.classList.add("hidden");
							document.getElementById("cd-main-menu").classList.remove("hidden");
							setup_main_menu();
						});
					}
				}
			}
		}
	}

	let next_buttons = document.getElementsByClassName("cd-deploy-step-next-btn");
	if(next_buttons){
		for(let i = 0; i < next_buttons.length; i++){
			let step_content_id = next_buttons[i].getAttribute("for");
			if(step_content_id){
				next_buttons[i].addEventListener("click",()=>{
					let step_content = document.getElementById(step_content_id);
					if(step_content){
						let ceph_deploy_step_id = step_content.getAttribute("for");
						let deploy_state = JSON.parse(localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
						if(deploy_state.hasOwnProperty(ceph_deploy_step_id) && deploy_state[ceph_deploy_step_id].step_content_id == step_content_id){
							let prog_int = Number(deploy_state[ceph_deploy_step_id].progress);
							prog_int++;
							deploy_state[ceph_deploy_step_id].progress = prog_int.toString();
							localStorage.setItem("ceph_deploy_state",JSON.stringify(deploy_state));
							sync_ceph_deploy_state();
							setup_progress_bar(ceph_deploy_step_id);
						}
					}
				});
			}
		}
	}

	let prev_buttons = document.getElementsByClassName("cd-deploy-step-prev-btn");
	if(prev_buttons){
		for(let i = 0; i < prev_buttons.length; i++){
			let step_content_id = prev_buttons[i].getAttribute("for");
			if(step_content_id){
				prev_buttons[i].addEventListener("click",()=>{
					let step_content = document.getElementById(step_content_id);
					if(step_content){
						let ceph_deploy_step_id = step_content.getAttribute("for");
						let deploy_state = JSON.parse(localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
						if(deploy_state.hasOwnProperty(ceph_deploy_step_id) && deploy_state[ceph_deploy_step_id].step_content_id == step_content_id){
							let prog_int = Number(deploy_state[ceph_deploy_step_id].progress);
							prog_int--;
							deploy_state[ceph_deploy_step_id].progress = prog_int.toString();
							localStorage.setItem("ceph_deploy_state",JSON.stringify(deploy_state));
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
function setup_progress_bar(deploy_step_key){
	let ceph_deploy_state = JSON.parse(localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
	let step_div = document.getElementById(ceph_deploy_state[deploy_step_key].step_content_id);
	if(!step_div) return;
	let progress_bar_steps = step_div.querySelectorAll(':scope [data-progress-bar-idx]');
	if(progress_bar_steps){
		for(let i = 0; i < progress_bar_steps.length; i++){
			if(progress_bar_steps[i].dataset.progressBarIdx === ceph_deploy_state[deploy_step_key].progress){
				progress_bar_steps[i].classList.add("progress-current-step");
				progress_bar_steps[i].classList.remove("progress-completed-step");
				let current_step_content = step_div.querySelector(`:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`);
				if(current_step_content){current_step_content.classList.remove("hidden");}
			}else if(Number(progress_bar_steps[i].dataset.progressBarIdx) < Number(ceph_deploy_state[deploy_step_key].progress)){
				progress_bar_steps[i].classList.remove("progress-current-step");
				progress_bar_steps[i].classList.add("progress-completed-step");
				let completed_step_content = step_div.querySelector(`:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`);
				if(completed_step_content){ completed_step_content.classList.add("hidden")}
			}else{
				progress_bar_steps[i].classList.remove("progress-current-step");
				progress_bar_steps[i].classList.remove("progress-completed-step");
				let next_step_content = step_div.querySelector(`:scope [data-step-content-idx="${progress_bar_steps[i].dataset.progressBarIdx}"]`);
				if(next_step_content){ next_step_content.classList.add("hidden")}
			}
		}
	}

	let prev_button = step_div.querySelector(':scope .cd-deploy-step-prev-btn');
	let next_button = step_div.querySelector(':scope .cd-deploy-step-next-btn');
	let done_button = step_div.querySelector(':scope .cd-deploy-step-done-btn');

	if(prev_button){
		if(ceph_deploy_state[deploy_step_key].progress === "0"){prev_button.disabled = true;}
		else{prev_button.removeAttribute("disabled");}
	}

	if(next_button){
		if(Number(ceph_deploy_state[deploy_step_key].progress) === progress_bar_steps.length -1 ){
			next_button.classList.add("hidden");
			if(done_button) done_button.classList.remove("hidden");
		}else{
			next_button.classList.remove("hidden");
			if(done_button) done_button.classList.add("hidden");
		}
	}
}



/**
 * set up event listeners for buttons.
 */
function setup_buttons(){
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

	document.getElementById("new-host-btn").addEventListener("click",add_host);
	document.getElementById("update-roles-btn").addEventListener("click",update_role_request);
	document.getElementById("global-options-btn").addEventListener("click",update_options_request);
	document.getElementById("generate-host-file-btn").addEventListener("click",generate_host_file);
	document.getElementById("generate-all-file-btn").addEventListener("click",generate_all_file);
	document.getElementById("ansible-ping-btn").addEventListener("click",ansible_ping);
	document.getElementById("ansible-device-alias-btn").addEventListener("click",ansible_device_alias);
	document.getElementById("ansible-core-btn").addEventListener("click",ansible_core);
	document.getElementById("ansible-cephfs-btn").addEventListener("click",ansible_cephfs);
	document.getElementById("toggle-theme").addEventListener("change",switch_theme);
}

/**
 * update the state of the main menu according to the deploy states stored in local storage.
 */
function setup_main_menu(){
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
		"deploy-step-dashboard"
	];
	deploy_step_current_state_json_str = (localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
	deploy_step_current_states = JSON.parse(deploy_step_current_state_json_str);
	// unlock the steps that have their unlock requirements met and update local storage.
	Object.entries(deploy_step_current_states).forEach(([deploy_step_id, obj]) => {
		if(obj.lock_state == "locked"){
			for(let i = 0; i < obj.unlock_requirements.length; i++){
				if(deploy_step_current_states[obj.unlock_requirements[i]].lock_state == "complete"){
					deploy_step_current_states[deploy_step_id].lock_state = "unlocked";
					break;
				}
			}
		}
	});
	localStorage.setItem("ceph_deploy_state",JSON.stringify(deploy_step_current_states));
	sync_ceph_deploy_state();

	// update the appearance based on updated states
	for(let i = 0; i < deploy_step_ids.length; i++){
		let deploy_step_element = document.getElementById(deploy_step_ids[i]);
		if(deploy_step_element){
			let status_div = deploy_step_element.querySelector('.cd-step-status');
			let start_btn = deploy_step_element.querySelector('.cd-deploy-step-start-btn');
			if(deploy_step_current_states[deploy_step_ids[i]].lock_state == "complete"){
				deploy_step_element.classList.add("cd-step-complete");
				if(status_div && start_btn){ 
					status_div.innerHTML = '<i class="fas fa-check"></i>';
					status_div.title = "completed";
					start_btn.classList.remove("hidden");
					start_btn.title = "redo";
					start_btn.innerHTML = '<i class="fas fa-redo"></i>';
				}
			}else if(deploy_step_current_states[deploy_step_ids[i]].lock_state == "unlocked"){
				deploy_step_element.classList.remove("cd-step-complete");
				if(status_div && start_btn){ 
					status_div.innerHTML = '<i class="fas fa-lock-open"></i>';
					status_div.title = "ready";
					start_btn.classList.remove("hidden");
					start_btn.title = "start";
				}
			}else if(deploy_step_current_states[deploy_step_ids[i]].lock_state == "locked"){
				deploy_step_element.classList.remove("cd-step-complete");
				if(status_div && start_btn){ 
					status_div.innerHTML = '<i class="fas fa-lock"></i>';
					status_div.title = "locked: complete required steps to unlock.";
					start_btn.classList.add("hidden");
					start_btn.title = "start";
				}
			}
		}
	}
}

/**
 * update the files stored on the administrator node that are used to store deploy state.
 */
function sync_ceph_deploy_state(){
	let ceph_deploy_state_json_str = (localStorage.getItem("ceph_deploy_state")??JSON.stringify(g_ceph_deploy_default_state));
	let ceph_deploy_state_file = cockpit.file("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json");
	ceph_deploy_state_file.read().then((content,tag) => {
	if(ceph_deploy_state_json_str != content){
			//localStorage and state file on server are not the same.
			//Update the state file stored on server.
			let update_state_file = ceph_deploy_state_file.replace(ceph_deploy_state_json_str);
			update_state_file.then(tag => {
				console.log("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json was updated"); 
				ceph_deploy_state_file.close();
				localStorage.setItem("ceph_deploy_state",ceph_deploy_state_json_str);
			});
			update_state_file.catch(e => {console.log("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json could not be updated."); ceph_deploy_state_file.close();});
		}
	});

	let playbook_state_json = (localStorage.getItem("playbook_state")??"{}");
	localStorage.setItem("playbook_state",playbook_state_json);
	let playbook_state_obj = JSON.parse(playbook_state_json);
	Object.entries(playbook_state_obj).forEach(([playbook, obj]) => {
		let done_button = document.getElementById(playbook);
		if(done_button && playbook_state_obj[playbook].result === 0){
			done_button.removeAttribute("disabled");
		}else if (done_button){
			done_button.disabled=true;
		}
	});

	let hosts_content = cockpit.file("/usr/share/ceph-ansible/hosts").read();
	hosts_content.then((content,tag) => {
		if(content){
			localStorage.setItem("hosts",content);
			let host_file_file_div_content = document.getElementById("host-file-content");
			host_file_file_div_content.classList.remove("hidden");
			document.getElementById("host-file-content").innerHTML = content;
			let show_button = document.getElementById("show-host-file-btn");
			show_button.addEventListener("click",show_host_file);
			show_button.classList.remove("hidden");
			show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
			document.getElementById("generate-host-file-btn").innerHTML = "Generate Again";
			document.getElementById("inv-file-hosts-default").classList.add("hidden");
			document.getElementById("ansible-config-inv-hosts-nxt").removeAttribute("disabled");
		}else{
			document.getElementById("ansible-config-inv-hosts-nxt").disabled=true;
		}
	});

	let all_content = cockpit.file("/usr/share/ceph-ansible/group_vars/all.yml").read();
	all_content.then((content,tag) => {
		if(content){
			localStorage.setItem("all.yml",content);
			let all_file_div_content = document.getElementById("all-file-content")
			all_file_div_content.innerHTML = content;
			all_file_div_content.classList.remove("hidden");
			let show_button = document.getElementById("show-all-file-btn");
			show_button.addEventListener("click",show_all_file);
			show_button.classList.remove("hidden");
			show_button.innerHTML = '<i class="fas fa-eye-slash"></i>';
			document.getElementById("generate-all-file-btn").innerHTML = "Generate Again";
			document.getElementById("inv-file-all-default").classList.add("hidden");
			document.getElementById("ansible-config-inv-all-nxt").removeAttribute("disabled");
		}else{
			document.getElementById("ansible-config-inv-all-nxt").disabled=true;
		}
	});
}

function get_ceph_deploy_initial_state(){
	return new Promise((resolve,reject) => {
		let ceph_deploy_state_file = cockpit.file("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json");
		initial_state = ceph_deploy_state_file.read();
		initial_state.then((content,tag) => {
			if(content){
				//defer to the state on the server as it is possible that more than one browser was used.
				localStorage.setItem("ceph_deploy_state",content);
				ceph_deploy_state_file.close();
				resolve();
			}else if(!content){
				//file does not exist locally
				let create_state_file = ceph_deploy_state_file.replace(JSON.stringify(g_ceph_deploy_default_state));
				create_state_file.then(tag => {
					console.log("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json was created."); 
					ceph_deploy_state_file.close();
					localStorage.setItem("ceph_deploy_state",JSON.stringify(g_ceph_deploy_default_state));
					resolve();
				});
				create_state_file.catch(e => {
					ceph_deploy_state_file.close();
					reject("/usr/share/cockpit/ceph-deploy/state/ceph_deploy_state.json could not be created."); 
				});
			}
		});
	}); 
}

async function start_ceph_deploy(){
	try{
		await get_ceph_deploy_initial_state();
	}catch(e){
		alert(e);
		console.error(e);
	}
	setup_buttons();
	get_param_file_content();
	monitor_playbook_state_file();
}

function main()
{
	let root_check = cockpit.permission({ admin: true });
	root_check.addEventListener(
		"changed", 
		function() {
			if(root_check.allowed){
				//user is an administrator, start the module as normal
                //setup on-click listeners for buttons as required.
				start_ceph_deploy();
			}else{
				//user is not an administrator, block the page content.
				let page_content = document.getElementById("ceph-deploy-content");
				page_content.innerHTML = "";
				let user_msg = document.createElement("div");
				user_msg.className = "content_block_msg";
				user_msg.innerHTML = "You must be an administrator to use this feature.";
				page_content.appendChild(user_msg);
			}
	 	}
	);
}

main();

cockpit.transport.wait(function() { });