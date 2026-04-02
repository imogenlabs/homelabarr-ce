#!/usr/bin/env python3
"""
Remove all mount-related dependencies from HomelabARR YAML files
This ensures containers can start independently without waiting for mount services
"""

import os
import yaml
import re
from pathlib import Path
from typing import Dict, List, Tuple

class MountDependencyRemover:
    def __init__(self, base_dir: str):
        self.base_dir = Path(base_dir)
        self.changes_made = []
        self.files_checked = 0
        self.dependencies_removed = 0
        
    def find_yaml_files(self) -> List[Path]:
        """Find all YAML files in the apps directory"""
        yaml_files = []
        for pattern in ['*.yml', '*.yaml']:
            yaml_files.extend(self.base_dir.rglob(pattern))
        return yaml_files
    
    def check_mount_dependency(self, data: Dict, path: str = "") -> List[Tuple[str, str]]:
        """Recursively check for mount-related dependencies in YAML structure"""
        mount_deps = []
        
        if isinstance(data, dict):
            # Check for depends_on section
            if 'depends_on' in data:
                deps = data['depends_on']
                if isinstance(deps, list):
                    # List format: depends_on: [mount, mount-enhanced, etc]
                    original_deps = deps.copy()
                    mount_related = [d for d in deps if 'mount' in d.lower() or 'unionfs' in d.lower()]
                    if mount_related:
                        # Remove mount-related dependencies
                        data['depends_on'] = [d for d in deps if d not in mount_related]
                        if not data['depends_on']:
                            # If no dependencies left, remove the entire depends_on section
                            del data['depends_on']
                        for dep in mount_related:
                            mount_deps.append((f"{path}.depends_on", dep))
                            
                elif isinstance(deps, dict):
                    # Dict format: depends_on: {mount: {condition: service_healthy}}
                    original_deps = deps.copy()
                    mount_keys = [k for k in deps.keys() if 'mount' in k.lower() or 'unionfs' in k.lower()]
                    if mount_keys:
                        for key in mount_keys:
                            del deps[key]
                            mount_deps.append((f"{path}.depends_on.{key}", str(original_deps[key])))
                        if not deps:
                            del data['depends_on']
            
            # Recursively check nested structures
            for key, value in data.items():
                if key != 'depends_on':
                    nested_path = f"{path}.{key}" if path else key
                    mount_deps.extend(self.check_mount_dependency(value, nested_path))
                    
        elif isinstance(data, list):
            # Check each item in list
            for i, item in enumerate(data):
                mount_deps.extend(self.check_mount_dependency(item, f"{path}[{i}]"))
                
        return mount_deps
    
    def process_file(self, file_path: Path) -> bool:
        """Process a single YAML file to remove mount dependencies"""
        self.files_checked += 1
        
        try:
            # Read the file
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse YAML
            data = yaml.safe_load(content)
            if not data:
                return False
                
            # Check for mount dependencies
            mount_deps = self.check_mount_dependency(data)
            
            if mount_deps:
                # Save the original for comparison
                original_content = content
                
                # Write the modified YAML back
                with open(file_path, 'w', encoding='utf-8') as f:
                    yaml.dump(data, f, default_flow_style=False, sort_keys=False, 
                             allow_unicode=True, width=1000)
                
                # Log the changes
                for location, dep in mount_deps:
                    self.changes_made.append({
                        'file': str(file_path.relative_to(self.base_dir)),
                        'location': location,
                        'removed': dep
                    })
                    self.dependencies_removed += 1
                    
                print(f"[FIXED] {file_path.relative_to(self.base_dir)}: Removed {len(mount_deps)} mount dependencies")
                return True
                
        except yaml.YAMLError as e:
            print(f"[ERROR] Failed to parse {file_path}: {e}")
        except Exception as e:
            print(f"[ERROR] Failed to process {file_path}: {e}")
            
        return False
    
    def verify_no_mount_deps(self, file_path: Path) -> List[str]:
        """Verify a file has no mount dependencies remaining"""
        issues = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Quick text search for any missed mount references in depends_on
            lines = content.split('\n')
            in_depends = False
            for i, line in enumerate(lines, 1):
                if 'depends_on:' in line:
                    in_depends = True
                elif in_depends and line and not line[0].isspace():
                    in_depends = False
                    
                if in_depends and ('mount' in line.lower() or 'unionfs' in line.lower()):
                    issues.append(f"Line {i}: {line.strip()}")
                    
        except Exception as e:
            issues.append(f"Error reading file: {e}")
            
        return issues
    
    def run(self):
        """Run the mount dependency removal process"""
        print("=" * 70)
        print("HomelabARR Mount Dependency Remover")
        print("=" * 70)
        print(f"\nSearching for YAML files in: {self.base_dir}")
        
        yaml_files = self.find_yaml_files()
        print(f"Found {len(yaml_files)} YAML files to check\n")
        
        # Process each file
        fixed_files = []
        for file_path in yaml_files:
            if self.process_file(file_path):
                fixed_files.append(file_path)
        
        # Verify all files are clean
        print("\n" + "=" * 70)
        print("VERIFICATION PHASE")
        print("=" * 70)
        
        remaining_issues = []
        for file_path in yaml_files:
            issues = self.verify_no_mount_deps(file_path)
            if issues:
                remaining_issues.append((file_path, issues))
                
        # Print summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Files checked: {self.files_checked}")
        print(f"Files modified: {len(fixed_files)}")
        print(f"Dependencies removed: {self.dependencies_removed}")
        
        if self.changes_made:
            print("\nChanges made:")
            for change in self.changes_made:
                print(f"  - {change['file']}: Removed '{change['removed']}' from {change['location']}")
                
        if remaining_issues:
            print("\n[WARNING] Potential remaining issues found:")
            for file_path, issues in remaining_issues:
                print(f"  {file_path.relative_to(self.base_dir)}:")
                for issue in issues:
                    print(f"    - {issue}")
        else:
            print("\n[SUCCESS] All mount dependencies have been removed!")
            
        # Also check for unionfs volume mounts (informational only)
        print("\n" + "=" * 70)
        print("UNIONFS VOLUME MOUNTS (Informational)")
        print("=" * 70)
        unionfs_count = 0
        for file_path in yaml_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    if 'unionfs:/mnt' in f.read():
                        unionfs_count += 1
            except:
                pass
                
        print(f"Files with 'unionfs:/mnt' volume mounts: {unionfs_count}")
        print("Note: These are NOT dependencies and don't prevent container startup.")
        print("They're harmless volume mounts that work with or without mount services.")

if __name__ == "__main__":
    # Run from the apps directory
    apps_dir = Path(__file__).parent.parent / "apps"
    
    if not apps_dir.exists():
        print(f"Error: Apps directory not found at {apps_dir}")
        exit(1)
        
    remover = MountDependencyRemover(apps_dir)
    remover.run()
    
    print("\n[DONE] Mount dependency removal complete!")
    print("Next steps:")
    print("1. Review the changes above")
    print("2. Test a few containers to ensure they start properly")
    print("3. Commit the changes: git add -A && git commit -m 'fix: Remove all mount dependencies'")