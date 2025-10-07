#!/usr/bin/env python3
import json
import os
import requests

# Proxy configuration
ES_HOST = "http://localhost:9200"
ES_AUTH = ("elastic", "elastic")

# Get directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_json_file(filename):
    """Load JSON data from file"""
    filepath = os.path.join(SCRIPT_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def _create_ilm_policy(policy_name):
    """Create ILM policy for asset inventory indices"""
    policy = _load_json_file("ilm_policy.json")

    response = requests.put(
        f"{ES_HOST}/_ilm/policy/{policy_name}",
        json=policy,
        timeout=5,
        auth=ES_AUTH,
    )
    response.raise_for_status()
    print(f"ILM Policy: {response.status_code}")
    print(response.text)


def _create_index_template(index_template_name):
    """Create index template for asset inventory"""
    template = _load_json_file("index_template.json")

    response = requests.put(
        f"{ES_HOST}/_index_template/{index_template_name}",
        json=template,
        timeout=5,
        auth=ES_AUTH,
    )
    response.raise_for_status()
    print(f"Index Template: {response.status_code}")
    print(response.text)


def _create_index(alias_name, index_name):
    """Create the initial index with alias"""
    index_body = {}
    index_body["aliases"] = {alias_name: {"is_write_index": True}}

    response = requests.put(
        f"{ES_HOST}/{index_name}",
        json=index_body,
        timeout=5,
        auth=ES_AUTH,
    )
    response.raise_for_status()
    print(f"Index Creation: {response.status_code}")
    print(response.text)


def _create_search_template(search_template_name):
    """Create a search template for common asset queries"""
    template = _load_json_file("search_template.json")

    response = requests.put(
        f"{ES_HOST}/_scripts/{search_template_name}",
        json=template,
        timeout=5,
        auth=ES_AUTH,
    )
    response.raise_for_status()
    print(f"Search Template: {response.status_code}")
    print(response.text)


def _index_sample_documents(index_name):
    """Index sample asset documents"""
    sample_assets = _load_json_file("sample_assets.json")

    for asset in sample_assets:
        response = requests.post(
            f"{ES_HOST}/{index_name}/_doc",
            json=asset,
            timeout=5,
            auth=ES_AUTH,
        )
        response.raise_for_status()
        asset_id = asset["asset_id"]
        print(f"Indexed {asset_id}: {response.status_code}")


def _main():
    print("Setting up Asset Inventory Example\n")

    policy_name = "asset-inventory-policy"
    index_name = "asset-inventory-000001"
    index_alias_name = "asset-inventory"
    index_template_name = "asset-inventory-template"
    search_template_name = "asset-search-template"

    print("1. Creating ILM Policy...")
    _create_ilm_policy(policy_name=policy_name)
    print()

    print("2. Creating Index Template...")
    _create_index_template(index_template_name=index_template_name)
    print()

    print("3. Creating Index with Alias...")
    _create_index(alias_name=index_alias_name, index_name=index_name)
    print()

    print("4. Creating Search Template...")
    _create_search_template(search_template_name=search_template_name)
    print()

    print("5. Indexing Sample Documents...")
    _index_sample_documents(index_name=index_alias_name)
    print()

    print("\nSetup complete!")
    print("\nExample queries:")
    print("  # View all assets")
    print(f"  curl {ES_HOST}/asset-inventory/_search?pretty")
    print("\n  # Search for servers")
    print(f"  curl {ES_HOST}/asset-inventory/_search?q=asset_type:server&pretty")
    print("\n  # Get asset by ID")
    print(f"  curl {ES_HOST}/asset-inventory/_search?q=asset_id:SRV-001&pretty")
    print("\n  # View ILM policy")
    print(f"  curl {ES_HOST}/_ilm/policy/asset-inventory-policy?pretty")


if __name__ == "__main__":
    _main()
